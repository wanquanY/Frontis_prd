import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import {
  ApiOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CheckCircleFilled,
  CloseOutlined,
  ExperimentOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  RocketOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Empty, Input, Select, message } from "antd";

import { FDE_AGENT_STORE_ITEMS } from "@/feature/fde/mockData";
import type {
  FdeAgentCategoryFilter,
  FdeAgentEvalReport,
  FdeAgentFeedbackRow,
  FdeAgentItem,
  FdeAgentMarketTab,
  FdeAgentType,
  FdeAgentVersionEvolution,
} from "@/feature/fde/types";

import styles from "./FdeAgentStoreView.module.less";

/* ─── 常量 ─── */

const MARKET_TABS: Array<{ key: FdeAgentMarketTab; label: string }> = [
  { key: "public", label: "通用Agent" },
  { key: "team", label: "团队共享" },
  { key: "mine", label: "我的Agent" },
];

const CATEGORY_FILTERS: Array<{ key: FdeAgentCategoryFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "general", label: "通用" },
  { key: "production", label: "生产" },
  { key: "supply", label: "供应" },
  { key: "sales", label: "销售" },
];

const CAT_LABEL: Record<string, string> = {
  general: "通用",
  production: "生产",
  supply: "供应",
  sales: "销售",
};

const CURRENT_USER = "陈蓝";

const AGENT_TYPE_LABEL: Record<FdeAgentType, string> = {
  metaagent: "MetaAgent",
  syngent: "Syngent",
  openclaw: "OpenClaw",
};

const AGENT_TYPE_COLOR: Record<FdeAgentType, string> = {
  metaagent: "#667eea",
  syngent: "#11998e",
  openclaw: "#f5576c",
};

const renderStars = (rating: number): string => {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
};

/* ─── 进化流程 Mock 数据 ─── */

type EvoPhase = "idle" | "suggestions" | "progress" | "lineage" | "comparing" | "testing" | "publishing";

const EVOLUTION_SUGGESTIONS = [
  { title: "优化Skill触发准确率", scope: "Skill路由层", desc: "通过补充边界测试用例，优化触发条件描述，减少误触发和漏触发情况。" },
  { title: "降低Token消耗", scope: "所有Skill执行", desc: "优化Prompt长度，减少冗余上下文，使用更精简的指令板，预计可降低20%的Token消耗。" },
  { title: "提升任务完成率", scope: "复杂任务场景", desc: "增强错误处理机制，添加重试逻辑，优化工具调用参数验证，提高复杂任务的成功率。" },
];

const PROGRESS_STEPS = ["数据回流", "数据清洗", "数据评估", "数据入库"];

const EVAL_SET_MOCK = { id: "E-20260402-001", passRate: "94.2%", time: "2026-04-02 14:35" };

const VERSION_TREE_MOCK = [
  { version: "v3", note: null as string | null, statusLabel: "已进化，待发布", date: "2026-02-20", rounds: null as number | null, isCurrent: true },
  { version: "v2", note: "优化推理逻辑 + 工具调用", statusLabel: null as string | null, date: null as string | null, rounds: 4, isCurrent: false },
  { version: "v1", note: "初始版本 - 基线模型", statusLabel: null as string | null, date: null as string | null, rounds: 5, isCurrent: false },
];

const CORE_METRICS_MOCK = [
  { label: "Skill触发准确率", value: "91%", trend: "↑13%", isUp: true },
  { label: "任务完成行为率", value: "89%", trend: "↑18%", isUp: true },
  { label: "结果质量评分", value: "87%", trend: "↑15%", isUp: true },
  { label: "执行耗时", value: "128ms", trend: "↓39%", isUp: false },
  { label: "Token消耗量", value: "1240", trend: "↓22%", isUp: false },
  { label: "回归基准保持率", value: "96%", trend: "↑12%", isUp: true },
];

const RADAR_AXES = ["准确率", "满意度", "工具成功率", "覆盖率", "稳定性", "响应速度"];
const RADAR_OLD = [65, 60, 55, 58, 62, 50];
const RADAR_NEW = [88, 82, 85, 80, 86, 78];

const TREND_SERIES = [
  { name: "Skill触发准确率", values: [78, 86, 91], color: "#3b82f6" },
  { name: "任务完成行为率", values: [72, 82, 89], color: "#a855f7" },
  { name: "结果质量评分", values: [75, 83, 87], color: "#10b981" },
];

const AGENT_FILES_FOR_TEST = [
  { key: "agent-md", name: "AGENT.md", icon: <FileMarkdownOutlined /> },
  { key: "soul-md", name: "soul.md", icon: <FileMarkdownOutlined /> },
  { key: "skill-md", name: "skill.md", icon: <FileMarkdownOutlined /> },
  { key: "runtime", name: "runtime.yaml", icon: <SettingOutlined /> },
  { key: "mcp", name: "mcp-services.yaml", icon: <ApiOutlined /> },
  { key: "tools", name: "tools/", icon: <ToolOutlined /> },
  { key: "prompts", name: "prompts/", icon: <MessageOutlined /> },
  { key: "tests", name: "tests/", icon: <ExperimentOutlined /> },
];

const TEST_MOCK_REPLIES_EVO = [
  "好的，我已收到你的请求。正在处理中...\n\n处理结果：合同风控检查完成，未发现重大风险条款。",
  "已完成分析，该合同存在 2 处潜在风险点，建议修改第 3.2 条和第 5.1 条。",
  "已根据最新合规要求更新风控规则，检测通过率提升至 97.5%。",
];

const PUBLISH_COVERS_EVO = [
  { key: "blue", label: "科技蓝", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { key: "green", label: "生长绿", gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { key: "orange", label: "活力橙", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { key: "cyan", label: "清新青", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { key: "purple", label: "创意紫", gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { key: "dark", label: "专业黑", gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)" },
];

interface EvoPublishForm {
  name: string;
  version: string;
  type: string;
  category: string;
  visibility: string;
  tags: string;
  description: string;
  cover: string;
}

const DEFAULT_EVO_PUBLISH: EvoPublishForm = {
  name: "",
  version: "",
  type: "skill",
  category: "general",
  visibility: "public",
  tags: "",
  description: "",
  cover: "blue",
};

/* ─── SVG 雷达图 ─── */

const RadarChart = (): JSX.Element => {
  const cx = 150, cy = 140, r = 100;
  const angles = RADAR_AXES.map((_, i) => (-90 + i * 60) * Math.PI / 180);
  const point = (angle: number, dist: number) =>
    `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
  const polygon = (values: number[]) =>
    values.map((v, i) => point(angles[i], (v / 100) * r)).join(" ");
  const grid = (level: number) =>
    angles.map(a => point(a, r * level)).join(" ");

  return (
    <div className={styles.radarWrapper}>
      <svg viewBox="0 0 300 310" className={styles.radarSvg}>
        <rect x="0" y="0" width="300" height="310" rx="16" fill="#1a1d23" />
        <circle cx="24" cy="26" r="14" fill="#ef4444" fillOpacity="0.15" />
        <text x="24" y="31" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="700">dD</text>
        <text x="46" y="31" fill="#fff" fontSize="14" fontWeight="700">版本对比雷达图</text>
        {[0.33, 0.66, 1].map(lv => (
          <polygon key={lv} points={grid(lv)} fill="none" stroke="#2d3139" strokeWidth="1" />
        ))}
        {angles.map((a, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#2d3139" strokeWidth="1" />
        ))}
        <polygon points={polygon(RADAR_OLD)} fill="rgba(156,163,175,0.15)" stroke="#9ca3af" strokeWidth="2" />
        <polygon points={polygon(RADAR_NEW)} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" />
        {RADAR_AXES.map((label, i) => {
          const lx = cx + (r + 20) * Math.cos(angles[i]);
          const ly = cy + (r + 20) * Math.sin(angles[i]);
          return <text key={i} x={lx} y={ly + 4} textAnchor="middle" fill="#9ca3af" fontSize="12">{label}</text>;
        })}
        <circle cx="75" cy="290" r="5" fill="#9ca3af" />
        <text x="85" y="294" fill="#9ca3af" fontSize="11">当前版本 V2</text>
        <circle cx="180" cy="290" r="5" fill="#10b981" />
        <text x="190" y="294" fill="#10b981" fontSize="11">候选版本 V3</text>
      </svg>
    </div>
  );
};

/* ─── SVG 趋势折线图 ─── */

const TrendLineChart = (): JSX.Element => {
  const W = 480, H = 260, pad = { l: 50, r: 20, t: 20, b: 50 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const versions = ["v1", "v2", "v3"];
  const yMin = 60, yMax = 100;
  const xPos = versions.map((_, i) => pad.l + (i / (versions.length - 1)) * cW);
  const yPos = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * cH;

  return (
    <div className={styles.trendChartWrapper}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.trendSvg}>
        {[60, 70, 80, 90, 100].map(v => (
          <g key={v}>
            <line x1={pad.l} y1={yPos(v)} x2={W - pad.r} y2={yPos(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 60 ? "0" : "4 4"} />
            <text x={pad.l - 8} y={yPos(v) + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{v}</text>
          </g>
        ))}
        <polygon
          points={`${xPos[0]},${yPos(70)} ${xPos[1]},${yPos(70)} ${xPos[2]},${yPos(70)} ${xPos[2]},${yPos(60)} ${xPos[0]},${yPos(60)}`}
          fill="rgba(59,130,246,0.08)"
        />
        {TREND_SERIES.map(s => (
          <g key={s.name}>
            <polyline points={s.values.map((v, i) => `${xPos[i]},${yPos(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth="2.5" />
            {s.values.map((v, i) => (
              <circle key={i} cx={xPos[i]} cy={yPos(v)} r="4" fill="#fff" stroke={s.color} strokeWidth="2" />
            ))}
          </g>
        ))}
        {versions.map((v, i) => (
          <text key={v} x={xPos[i]} y={H - pad.b + 24} textAnchor="middle" fill="var(--text-muted)" fontSize="12">{v}</text>
        ))}
      </svg>
      <div className={styles.trendLegend}>
        {TREND_SERIES.map(s => (
          <span key={s.name} className={styles.trendLegendItem}>
            <span className={styles.trendLegendDot} style={{ borderColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─── 进化指标渲染 ─── */

const EvolutionMetrics = ({ evo }: { evo: FdeAgentVersionEvolution }): JSX.Element => {
  const items = [
    { label: "Skill触发准确率", value: evo.skillTriggerAccuracy, trend: evo.skillTriggerAccuracyTrend },
    { label: "任务完成行为率", value: evo.taskCompletionRate, trend: evo.taskCompletionRateTrend },
    { label: "结果质量评分", value: evo.qualityScore, trend: evo.qualityScoreTrend },
    { label: "执行耗时", value: evo.executionTime, trend: evo.executionTimeTrend },
    { label: "Token消耗量", value: evo.tokenUsage, trend: evo.tokenUsageTrend },
    { label: "回归基准保持率", value: evo.regressionRetention, trend: evo.regressionRetentionTrend },
  ];
  return (
    <div className={styles.evolutionGrid}>
      {items.map(m => (
        <div key={m.label} className={styles.metricCard}>
          <span className={styles.metricLabel}>{m.label}</span>
          <span className={styles.metricValue}>
            <span className={styles.metricNumber}>{m.value}</span>
            <span className={m.trend.startsWith("↑") ? styles.metricTrendUp : styles.metricTrendDown}>
              {m.trend}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── 测评报告面板 ─── */

const EvalReportPanel = ({
  version,
  report,
  onBack,
}: {
  version: string;
  report: FdeAgentEvalReport;
  onBack: () => void;
}): JSX.Element => (
  <div className={styles.reportRoot}>
    <div className={styles.reportHeader}>
      <button type="button" className={styles.reportBackBtn} onClick={onBack}>
        <ArrowLeftOutlined />
      </button>
      <h3 className={styles.reportTitle}>v{version} 版本评测报告</h3>
    </div>

    <div className={styles.reportBody}>
      {/* 报告摘要 */}
      <div className={styles.reportSection}>
        <h4 className={styles.reportSectionTitle}>报告摘要</h4>
        <p className={styles.reportSummary}>{report.summary}</p>
      </div>

      {/* 性能指标 */}
      <div className={styles.reportSection}>
        <h4 className={styles.reportSectionTitle}>性能指标</h4>
        <div className={styles.reportMetricList}>
          <div className={classNames(styles.reportMetricRow, styles.reportMetricRowHighlight)}>
            <span className={styles.reportMetricLabel}>综合Benchmark分数</span>
            <span className={styles.reportMetricValueGroup}>
              <span className={styles.reportMetricScore}>{report.overallScore}</span>
              <span className={styles.reportMetricTrendUp}>{report.overallScoreTrend}</span>
            </span>
          </div>
          {report.metrics.map(m => (
            <div key={m.label} className={styles.reportMetricRow}>
              <span className={styles.reportMetricLabel}>{m.label}</span>
              <span className={styles.reportMetricValueGroup}>
                <span className={styles.reportMetricValue}>{m.value}</span>
                <span
                  className={
                    m.trend.startsWith("↑")
                      ? styles.reportMetricTrendUp
                      : styles.reportMetricTrendDown
                  }
                >
                  {m.trend}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 测试详情 */}
      <div className={styles.reportSection}>
        <h4 className={styles.reportSectionTitle}>测试详情</h4>
        <div className={styles.reportDetailGrid}>
          <div className={styles.reportDetailItem}>
            <span className={styles.reportDetailLabel}>测试时间</span>
            <span className={styles.reportDetailValue}>{report.testTime}</span>
          </div>
          <div className={styles.reportDetailItem}>
            <span className={styles.reportDetailLabel}>测试轮次</span>
            <span className={styles.reportDetailValue}>{report.testRounds}轮</span>
          </div>
          <div className={styles.reportDetailItem}>
            <span className={styles.reportDetailLabel}>测试场景</span>
            <span className={styles.reportDetailValue}>{report.testScenes.join("、")}</span>
          </div>
        </div>
      </div>

      {/* 问题与建议 */}
      <div className={styles.reportSection}>
        <h4 className={styles.reportSectionTitle}>问题与建议</h4>
        <div className={styles.reportIssueBlock}>
          <div className={styles.reportIssueRow}>
            <span className={styles.reportIssueBullet}>问题：</span>
            <span className={styles.reportIssueText}>{report.issues}</span>
          </div>
          <div className={styles.reportIssueRow}>
            <span className={styles.reportSuggestionBullet}>建议：</span>
            <span className={styles.reportIssueText}>{report.suggestions}</span>
          </div>
        </div>
      </div>

      {/* 结论 */}
      <div className={styles.reportSection}>
        <h4 className={styles.reportSectionTitle}>结论</h4>
        <p className={styles.reportConclusion}>{report.conclusion}</p>
      </div>
    </div>
  </div>
);

/* ─── 回流数据按企业分组 ─── */

const groupByEnterprise = (rows: FdeAgentFeedbackRow[]): Record<string, FdeAgentFeedbackRow[]> => {
  const map: Record<string, FdeAgentFeedbackRow[]> = {};
  for (const row of rows) {
    (map[row.enterprise] ??= []).push(row);
  }
  return map;
};

/* ─── 组件 ─── */

interface FdeAgentStoreViewProps {
  onNavigateToAgentDev?: () => void;
}

export const FdeAgentStoreView = ({
  onNavigateToAgentDev,
}: FdeAgentStoreViewProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<FdeAgentMarketTab>("public");
  const [categoryFilter, setCategoryFilter] = useState<FdeAgentCategoryFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [viewingReportVersion, setViewingReportVersion] = useState<string | null>(null);
  const [isEvolving, setIsEvolving] = useState(false);
  const [selectedEnterprises, setSelectedEnterprises] = useState<Set<string>>(new Set());
  const [chatInput, setChatInput] = useState("");

  // 进化状态机
  const [evoPhase, setEvoPhase] = useState<EvoPhase>("idle");
  const [progressCompleted, setProgressCompleted] = useState(0);
  const evoChatBodyRef = useRef<HTMLDivElement>(null);

  // 测试
  const [testFileIdx, setTestFileIdx] = useState(0);
  const [testReady, setTestReady] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [testInput, setTestInput] = useState("");
  const testReplyIdx = useRef(0);
  const testBodyRef = useRef<HTMLDivElement>(null);

  // 发布
  const [publishType, setPublishType] = useState<"skill" | "agent" | null>(null);
  const [publishForm, setPublishForm] = useState<EvoPublishForm>(DEFAULT_EVO_PUBLISH);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishStep, setPublishStep] = useState<"type" | "selectSkill" | "newOrUpdate" | "form">("type");
  const [publishIsNew, setPublishIsNew] = useState(true);
  const [publishSelectedSkill, setPublishSelectedSkill] = useState<string | null>(null);

  /* 过滤 */
  const filteredAgents = useMemo<FdeAgentItem[]>(() => {
    let items = FDE_AGENT_STORE_ITEMS;
    if (activeTab === "public") items = items.filter(a => a.visibility === "public");
    else if (activeTab === "team") items = items.filter(a => a.visibility === "team");
    else items = items.filter(a => a.publisher === CURRENT_USER);

    if (categoryFilter !== "all") items = items.filter(a => a.category === categoryFilter);

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      items = items.filter(
        a =>
          a.name.toLowerCase().includes(kw) ||
          a.description.toLowerCase().includes(kw) ||
          a.tags.some(t => t.toLowerCase().includes(kw)),
      );
    }
    return items;
  }, [activeTab, categoryFilter, keyword]);

  const selectedAgent = useMemo<FdeAgentItem | null>(
    () => (selectedAgentId ? FDE_AGENT_STORE_ITEMS.find(a => a.id === selectedAgentId) ?? null : null),
    [selectedAgentId],
  );

  const isOwnAgent = selectedAgent?.publisher === CURRENT_USER;

  const enterpriseGroups = useMemo(
    () => (selectedAgent ? groupByEnterprise(selectedAgent.feedbackData) : {}),
    [selectedAgent],
  );

  const enterpriseList = useMemo(() => Object.keys(enterpriseGroups), [enterpriseGroups]);

  const handleToggleEnterprise = useCallback((name: string) => {
    setSelectedEnterprises(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleSelectAllEnterprises = useCallback(() => {
    setSelectedEnterprises(prev =>
      prev.size === enterpriseList.length ? new Set() : new Set(enterpriseList),
    );
  }, [enterpriseList]);

  const handleStartEvolution = useCallback(() => {
    setIsEvolving(true);
    setSelectedEnterprises(new Set(enterpriseList));
    setEvoPhase("idle");
    setProgressCompleted(0);
  }, [enterpriseList]);

  const handleExitEvolution = useCallback(() => {
    setIsEvolving(false);
    setSelectedEnterprises(new Set());
    setChatInput("");
    setEvoPhase("idle");
    setProgressCompleted(0);
    setPublishType(null);
    setPublishForm(DEFAULT_EVO_PUBLISH);
    setPublishSuccess(false);
    setPublishStep("type");
    setPublishIsNew(true);
    setPublishSelectedSkill(null);
    setTestMessages([]);
    setTestReady(false);
    setTestFileIdx(0);
  }, []);

  /* 点击"进化"按钮 → 显示建议 */
  const handleClickEvolve = useCallback(() => {
    if (selectedEnterprises.size === 0) return;
    setEvoPhase("suggestions");
  }, [selectedEnterprises.size]);

  /* 点击"执行进化" → 进度动画 */
  const handleExecuteEvolution = useCallback(() => {
    setEvoPhase("progress");
    setProgressCompleted(0);
  }, []);

  /* 进度动画 effect */
  useEffect(() => {
    if (evoPhase !== "progress") return;
    if (progressCompleted >= PROGRESS_STEPS.length) {
      const t = setTimeout(() => setEvoPhase("lineage"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgressCompleted(prev => prev + 1), 800);
    return () => clearTimeout(t);
  }, [evoPhase, progressCompleted]);

  /* 进化聊天自动滚动 */
  useEffect(() => {
    if (isEvolving && evoChatBodyRef.current) {
      requestAnimationFrame(() => {
        evoChatBodyRef.current?.scrollTo({ top: evoChatBodyRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [isEvolving, evoPhase, progressCompleted]);

  /* 测试 runtime 写入动画 */
  useEffect(() => {
    if (evoPhase !== "testing" || testReady) return;
    if (testFileIdx >= AGENT_FILES_FOR_TEST.length) {
      setTestReady(true);
      return;
    }
    const t = setTimeout(() => setTestFileIdx(prev => prev + 1), 600);
    return () => clearTimeout(t);
  }, [evoPhase, testReady, testFileIdx]);

  /* 测试自动滚动 */
  useEffect(() => {
    if (evoPhase === "testing" && testBodyRef.current) {
      requestAnimationFrame(() => {
        testBodyRef.current?.scrollTo({ top: testBodyRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [evoPhase, testFileIdx, testMessages]);

  const handleEnterTest = useCallback(() => {
    setEvoPhase("testing");
    setTestReady(false);
    setTestFileIdx(0);
    setTestMessages([]);
    setTestInput("");
  }, []);

  const handleTestSend = useCallback(() => {
    const text = testInput.trim();
    if (!text || !testReady) return;
    const reply = TEST_MOCK_REPLIES_EVO[testReplyIdx.current % TEST_MOCK_REPLIES_EVO.length];
    testReplyIdx.current += 1;
    setTestMessages(prev => [...prev, { role: "user", text }, { role: "assistant", text: reply }]);
    setTestInput("");
  }, [testInput, testReady]);

  const handleEnterPublish = useCallback(() => {
    setEvoPhase("publishing");
    setPublishType(null);
    setPublishStep("type");
    setPublishIsNew(true);
    setPublishSelectedSkill(null);
    const nextVersion = selectedAgent ? `${selectedAgent.version.split(".").slice(0, -1).join(".")}.${parseInt(selectedAgent.version.split(".").pop() ?? "0") + 1}` : "1.0.1";
    setPublishForm({ ...DEFAULT_EVO_PUBLISH, version: nextVersion, name: selectedAgent?.name ?? "" });
    setPublishSuccess(false);
  }, [selectedAgent]);

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

  const updatePubForm = useCallback((patch: Partial<EvoPublishForm>) => {
    setPublishForm(prev => ({ ...prev, ...patch }));
  }, []);

  /* ─── 详情页 ─── */
  if (selectedAgent) {
    return (
      <div className={styles.detailRoot}>
        <div className={styles.detailTopBar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => {
              setSelectedAgentId(null);
              setExpandedVersion(null);
              setViewingReportVersion(null);
              handleExitEvolution();
            }}
          >
            <ArrowLeftOutlined /> 返回列表
          </button>
          <div className={styles.detailTopActions}>
            {isOwnAgent && !isEvolving && (
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleStartEvolution}>
                继续进化
              </Button>
            )}
            {isOwnAgent && (
              <Button onClick={onNavigateToAgentDev}>
                <PlusOutlined /> 创建 Agent
              </Button>
            )}
          </div>
        </div>

        <div
          className={classNames(styles.detailBody, isEvolving && styles.detailBodyEvolution)}
        >
          {/* 左侧 */}
          <div className={classNames(
            styles.detailLeft,
            isEvolving && styles.detailLeftEvolution,
            (evoPhase === "comparing" || evoPhase === "testing" || evoPhase === "publishing") && styles.detailLeftHidden,
          )}>
            <div className={styles.detailHeader}>
              <div className={styles.detailIconLarge} style={{ background: selectedAgent.iconColor }}>
                {selectedAgent.iconText}
              </div>
              <div className={styles.detailHeaderInfo}>
                <h2 className={styles.detailName}>{selectedAgent.name}</h2>
                <div className={styles.detailMetaRow}>
                  <span
                    className={styles.agentTypeBadge}
                    style={{
                      background: `color-mix(in srgb, ${AGENT_TYPE_COLOR[selectedAgent.agentType]} 12%, transparent)`,
                      color: AGENT_TYPE_COLOR[selectedAgent.agentType],
                    }}
                  >
                    {AGENT_TYPE_LABEL[selectedAgent.agentType]}
                  </span>
                  <span className={styles.catBadge}>{CAT_LABEL[selectedAgent.category]}</span>
                  <span className={styles.detailVersion}>v{selectedAgent.version}</span>
                </div>
              </div>
            </div>

            <p className={styles.detailDescription}>{selectedAgent.description}</p>

            <div className={styles.tagList}>
              {selectedAgent.tags.map(tag => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>

            {/* Skills */}
            <div>
              <h4 className={styles.sectionTitle}>技能配置</h4>
              <div className={styles.skillRefList}>
                {selectedAgent.skills.map(sk => (
                  <div key={sk.skillName} className={styles.skillRefRow}>
                    <span className={styles.skillRefName}>{sk.skillName}</span>
                    <span className={styles.skillRefVersion}>v{sk.version}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 回流数据 */}
            {isOwnAgent && selectedAgent.feedbackData.length > 0 && (
              <div className={styles.feedbackSection}>
                <h4 className={styles.sectionTitle}>回流数据</h4>
                {Object.entries(enterpriseGroups).map(([enterprise, rows]) => (
                  <div key={enterprise}>
                    <div className={styles.feedbackEnterprise}>
                      <span className={styles.enterpriseTag}>{enterprise}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {rows.length} 条
                      </span>
                    </div>
                    <table className={styles.feedbackTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>对话摘要</th>
                          <th>来源</th>
                          <th>评分</th>
                          <th>tool轮</th>
                          <th>对话轮</th>
                          <th>Token</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => (
                          <tr key={row.id}>
                            <td>{row.id}</td>
                            <td>{row.summary}</td>
                            <td>
                              <span
                                className={classNames(styles.sourceBadge, {
                                  [styles.sourceOnline]: row.source === "线上回流",
                                  [styles.sourceManual]: row.source === "人工标注",
                                })}
                              >
                                {row.source}
                              </span>
                            </td>
                            <td><span className={styles.ratingStars}>{renderStars(row.rating)}</span></td>
                            <td>{row.toolCallRounds}</td>
                            <td>{row.dialogueRounds}</td>
                            <td>{row.tokenUsage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：版本时间线 / 进化面板 / 对比 / 测试 / 发布 */}
          {isEvolving ? (
            evoPhase === "comparing" ? (
              /* ── 进化对比视图 ── */
              <div className={styles.evoCompareRoot}>
                <div className={styles.evoCompareHeader}>
                  <button type="button" className={styles.evoCompareBackBtn} onClick={() => setEvoPhase("lineage")}>
                    <ArrowLeftOutlined /> 返回
                  </button>
                  <h3 className={styles.evoCompareTitle}>进化趋势</h3>
                  <div className={styles.evoCompareActions}>
                    <Button icon={<PlayCircleOutlined />} onClick={handleEnterTest}>测试</Button>
                    <Button type="primary" icon={<RocketOutlined />} onClick={handleEnterPublish}>发布上架</Button>
                  </div>
                </div>
                <div className={styles.evoCompareBody}>
                  {/* 版本演进树 */}
                  <div className={styles.evoTreeSection}>
                    <h4 className={styles.evoTreeTitle}>🌿 版本演进树</h4>
                    <div className={styles.evoTree}>
                      {VERSION_TREE_MOCK.map((node) => (
                        <div key={node.version} className={classNames(styles.evoTreeNode, node.isCurrent && styles.evoTreeNodeCurrent)}>
                          <div className={classNames(styles.evoTreeDot, node.isCurrent && styles.evoTreeDotFilled)} />
                          <div className={classNames(styles.evoTreeCard, node.isCurrent && styles.evoTreeCardCurrent)}>
                            <div className={styles.evoTreeCardTop}>
                              <span className={styles.evoTreeVersion}>{node.version}</span>
                              {node.isCurrent && (
                                <Button size="small" type="link" className={styles.evoTreeReportLink}>评测报告</Button>
                              )}
                              <span style={{ flex: 1 }} />
                              {node.statusLabel && <span className={styles.evoTreeStatus}>{node.statusLabel}</span>}
                              {node.rounds != null && <span className={styles.evoTreeRounds}>{node.rounds}轮次</span>}
                            </div>
                            {node.date && <div className={styles.evoTreeDate}>更新时间: {node.date}</div>}
                            {node.note && <div className={styles.evoTreeNote}>{node.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 核心指标 */}
                  <div className={styles.evoCoreSection}>
                    <h4 className={styles.evoCoreTitle}>🌐 核心指标</h4>
                    <div className={styles.evoCoreGrid}>
                      {CORE_METRICS_MOCK.map(m => (
                        <div key={m.label} className={styles.evoCoreCard}>
                          <span className={styles.evoCoreLabel}>{m.label}</span>
                          <span className={styles.evoCoreValue}>{m.value}</span>
                          <span className={m.isUp ? styles.evoCoreTrendUp : styles.evoCoreTrendDown}>{m.trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 版本演进趋势 */}
                  <div className={styles.evoTrendSection}>
                    <h4 className={styles.evoTrendTitle}>📈 版本演进趋势</h4>
                    <TrendLineChart />
                  </div>
                </div>
              </div>
            ) : evoPhase === "testing" ? (
              /* ── 测试面板 ── */
              <div className={styles.evoTestRoot}>
                <div className={styles.evoTestHeader}>
                  <button type="button" className={styles.evoCompareBackBtn} onClick={() => setEvoPhase("comparing")}>
                    <ArrowLeftOutlined /> 返回进化对比
                  </button>
                  <h3 className={styles.evoCompareTitle}>Agent 测试</h3>
                </div>
                <div className={styles.evoTestBody} ref={testBodyRef}>
                  {AGENT_FILES_FOR_TEST.slice(0, testFileIdx).map(f => (
                    <div key={f.key} className={styles.evoTestWriteItem}>
                      <CheckCircleFilled style={{ color: "#3cbf7b" }} />
                      <span>已写入 <strong>{f.name}</strong> → runtime</span>
                    </div>
                  ))}
                  {!testReady && testFileIdx < AGENT_FILES_FOR_TEST.length && (
                    <div className={styles.evoTestWriteItem}>
                      <LoadingOutlined spin style={{ color: "var(--primary)" }} />
                      <span>正在写入 <strong>{AGENT_FILES_FOR_TEST[testFileIdx].name}</strong> → runtime...</span>
                    </div>
                  )}
                  {testReady && (
                    <div className={styles.evoTestDoneMsg}>
                      <CheckCircleFilled style={{ color: "#3cbf7b" }} />
                      <span>Agent 已在 runtime 成功启动，请开始进行测试。</span>
                    </div>
                  )}
                  {testMessages.map((msg, i) => (
                    <div key={i} className={classNames(styles.evoTestMsgRow, msg.role === "user" ? styles.evoTestMsgUser : styles.evoTestMsgAssistant)}>
                      <div className={classNames(styles.evoTestMsgBubble, msg.role === "user" && styles.evoTestMsgBubbleUser)}>
                        {msg.text.split("\n").map((line, li) => <p key={li} style={{ margin: 0 }}>{line || <br />}</p>)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.evoTestFooter}>
                  <Input
                    value={testInput}
                    placeholder={testReady ? "输入问题测试 Agent..." : "等待 runtime 启动..."}
                    disabled={!testReady}
                    className={styles.chatInput}
                    onChange={e => setTestInput(e.target.value)}
                    onPressEnter={handleTestSend}
                  />
                  <Button type="primary" icon={<ArrowUpOutlined />} disabled={!testReady} onClick={handleTestSend}>发送</Button>
                </div>
              </div>
            ) : evoPhase === "publishing" ? (
              /* ── 发布面板 ── */
              <div className={styles.evoPublishRoot}>
                <div className={styles.evoTestHeader}>
                  <button type="button" className={styles.evoCompareBackBtn} onClick={() => setEvoPhase("comparing")}>
                    <ArrowLeftOutlined /> 返回进化对比
                  </button>
                  <h3 className={styles.evoCompareTitle}>发布上架</h3>
                </div>
                <div className={styles.evoPublishBody}>
                  {publishSuccess ? (
                    <div className={styles.evoPublishSuccess}>
                      <CheckCircleFilled style={{ fontSize: 48, color: "#3cbf7b" }} />
                      <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18, fontWeight: 700 }}>
                        {publishType === "skill" ? "Skill 已发布到 Skill 广场" : "Agent 已发布到 Agent Store"}
                      </h3>
                      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>
                        {publishForm.name} v{publishForm.version} {publishIsNew ? "已作为全新项目发布。" : "已作为新版本发布。"}
                      </p>
                      <Button type="primary" onClick={() => setEvoPhase("comparing")}>返回进化对比</Button>
                    </div>
                  ) : publishStep === "type" ? (
                    /* 第一步：选择发布类型 */
                    <div className={styles.evoPublishTypeSection}>
                      <div className={styles.evoPublishHint}>当前为进化后的新版本，请选择发布类型并更新版本号。</div>
                      <div className={styles.evoPublishTypeCards}>
                        <button type="button" className={styles.evoPublishTypeCard} onClick={() => {
                          setPublishType("skill");
                          setPublishStep("selectSkill");
                        }}>
                          <ThunderboltOutlined className={styles.evoPublishTypeIcon} />
                          <div><div className={styles.evoPublishTypeTitle}>发布为 Skill</div><div className={styles.evoPublishTypeDesc}>选择一个 Skill 发布到 Skill 广场</div></div>
                        </button>
                        <button type="button" className={styles.evoPublishTypeCard} onClick={() => {
                          setPublishType("agent");
                          setPublishStep("newOrUpdate");
                        }}>
                          <AppstoreOutlined className={styles.evoPublishTypeIcon} />
                          <div><div className={styles.evoPublishTypeTitle}>发布为 Agent</div><div className={styles.evoPublishTypeDesc}>将当前 Agent 发布到 Agent Store</div></div>
                        </button>
                      </div>
                    </div>
                  ) : publishStep === "selectSkill" ? (
                    /* 第二步（Skill）：选择某个 Skill */
                    <div className={styles.evoPublishTypeSection}>
                      <h4 className={styles.evoPublishFormSectionTitle}>选择要发布的 Skill</h4>
                      <div className={styles.evoPublishSkillList}>
                        {(selectedAgent?.skills ?? []).map(sk => (
                          <button
                            key={sk.skillName}
                            type="button"
                            className={classNames(styles.evoPublishSkillItem, publishSelectedSkill === sk.skillName && styles.evoPublishSkillItemActive)}
                            onClick={() => {
                              setPublishSelectedSkill(sk.skillName);
                              updatePubForm({ name: sk.skillName });
                              setPublishStep("newOrUpdate");
                            }}
                          >
                            <ThunderboltOutlined />
                            <span>{sk.skillName}</span>
                            <span className={styles.evoPublishSkillVer}>v{sk.version}</span>
                          </button>
                        ))}
                      </div>
                      <div className={styles.evoPublishFooter}>
                        <Button onClick={() => { setPublishType(null); setPublishStep("type"); }}>上一步</Button>
                      </div>
                    </div>
                  ) : publishStep === "newOrUpdate" ? (
                    /* 第三步：新版本 or 新项目 */
                    <div className={styles.evoPublishTypeSection}>
                      <h4 className={styles.evoPublishFormSectionTitle}>
                        {publishType === "skill" ? `「${publishSelectedSkill}」发布方式` : `「${selectedAgent?.name}」发布方式`}
                      </h4>
                      <div className={styles.evoPublishTypeCards}>
                        <button type="button" className={styles.evoPublishTypeCard} onClick={() => {
                          setPublishIsNew(false);
                          const nextVer = selectedAgent ? `${selectedAgent.version.split(".").slice(0, -1).join(".")}.${parseInt(selectedAgent.version.split(".").pop() ?? "0") + 1}` : "1.0.1";
                          updatePubForm({
                            name: publishType === "skill" ? (publishSelectedSkill ?? "") : (selectedAgent?.name ?? ""),
                            version: nextVer,
                          });
                          setPublishStep("form");
                        }}>
                          <RocketOutlined className={styles.evoPublishTypeIcon} />
                          <div>
                            <div className={styles.evoPublishTypeTitle}>
                              {publishType === "skill" ? "发布为已有 Skill 的新版本" : "发布为已有 Agent 的新版本"}
                            </div>
                            <div className={styles.evoPublishTypeDesc}>
                              {publishType === "skill"
                                ? "在 Skill 广场中更新此 Skill 到新版本"
                                : "在 Agent Store 中更新此 Agent 到新版本"}
                            </div>
                          </div>
                        </button>
                        <button type="button" className={styles.evoPublishTypeCard} onClick={() => {
                          setPublishIsNew(true);
                          updatePubForm({ name: "", version: "1.0.0" });
                          setPublishStep("form");
                        }}>
                          <PlusOutlined className={styles.evoPublishTypeIcon} />
                          <div>
                            <div className={styles.evoPublishTypeTitle}>
                              {publishType === "skill" ? "发布为全新 Skill" : "发布为全新 Agent"}
                            </div>
                            <div className={styles.evoPublishTypeDesc}>
                              {publishType === "skill"
                                ? "创建一个全新的 Skill 并发布到 Skill 广场"
                                : "创建一个全新的 Agent 并发布到 Agent Store"}
                            </div>
                          </div>
                        </button>
                      </div>
                      <div className={styles.evoPublishFooter}>
                        <Button onClick={() => setPublishStep(publishType === "skill" ? "selectSkill" : "type")}>上一步</Button>
                      </div>
                    </div>
                  ) : (
                    /* 第四步：表单 */
                    <div className={styles.evoPublishFormArea}>
                      {!publishIsNew && (
                        <div className={styles.evoPublishHint}>
                          {publishType === "skill"
                            ? `将作为「${publishSelectedSkill}」的新版本发布，请确认版本号。`
                            : `将作为「${selectedAgent?.name}」的新版本发布，请确认版本号。`}
                        </div>
                      )}
                      <div className={styles.evoPublishFormSection}>
                        <h4 className={styles.evoPublishFormSectionTitle}>{publishType === "skill" ? "Skill 信息" : "Agent 信息"}</h4>
                        <div className={styles.evoPublishFormRow}>
                          <div className={styles.evoPublishFormLabel}>
                            名称 <span style={{ color: "#f5222d" }}>*</span>
                          </div>
                          <Input value={publishForm.name} maxLength={200} disabled={!publishIsNew} onChange={e => updatePubForm({ name: e.target.value })} />
                        </div>
                        <div className={styles.evoPublishFormRow}>
                          <div className={styles.evoPublishFormLabel}>
                            版本号 <span style={{ color: "#f5222d" }}>*</span>
                          </div>
                          <Input value={publishForm.version} maxLength={64} onChange={e => updatePubForm({ version: e.target.value })} />
                        </div>
                        {publishType === "skill" ? (
                          <div className={styles.evoPublishFormRow}>
                            <div className={styles.evoPublishFormLabel}>分类</div>
                            <Select value={publishForm.type} onChange={v => updatePubForm({ type: v })} style={{ width: "100%" }}
                              options={[{ value: "workflow", label: "Workflow 类" }, { value: "skill", label: "Skill 类" }, { value: "model", label: "模型类" }]}
                            />
                          </div>
                        ) : (
                          <div className={styles.evoPublishFormRow}>
                            <div className={styles.evoPublishFormLabel}>分类</div>
                            <Select value={publishForm.category} onChange={v => updatePubForm({ category: v })} style={{ width: "100%" }}
                              options={[{ value: "general", label: "通用" }, { value: "production", label: "生产" }, { value: "supply", label: "供应链" }, { value: "sales", label: "销售" }]}
                            />
                          </div>
                        )}
                        <div className={styles.evoPublishFormRow}>
                          <div className={styles.evoPublishFormLabel}>可见性</div>
                          <Select value={publishForm.visibility} onChange={v => updatePubForm({ visibility: v })} style={{ width: "100%" }}
                            options={[
                              { value: "public", label: publishType === "skill" ? "公开到 Skill 广场" : "公开到 Agent Store" },
                              { value: "private", label: "仅自己可见" },
                              { value: "team", label: "团队内部共享" },
                            ]}
                          />
                        </div>
                        <div className={styles.evoPublishFormRow}>
                          <div className={styles.evoPublishFormLabel}>标签</div>
                          <Input value={publishForm.tags} maxLength={200} placeholder="多个标签用逗号分隔" onChange={e => updatePubForm({ tags: e.target.value })} />
                        </div>
                        <div className={styles.evoPublishFormRow}>
                          <div className={styles.evoPublishFormLabel}>描述</div>
                          <Input.TextArea value={publishForm.description} maxLength={4000} rows={3} showCount onChange={e => updatePubForm({ description: e.target.value })} />
                        </div>
                      </div>
                      <div className={styles.evoPublishFormSection}>
                        <h4 className={styles.evoPublishFormSectionTitle}>封面</h4>
                        <div className={styles.evoPublishCoverGrid}>
                          {PUBLISH_COVERS_EVO.map(c => (
                            <button key={c.key} type="button" className={classNames(styles.evoPublishCoverItem, publishForm.cover === c.key && styles.evoPublishCoverItemActive)} onClick={() => updatePubForm({ cover: c.key })}>
                              <span className={styles.evoPublishCoverSwatch} style={{ background: c.gradient }} />
                              <span className={styles.evoPublishCoverLabel}>{c.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.evoPublishFooter}>
                        <Button onClick={() => setPublishStep("newOrUpdate")}>上一步</Button>
                        <Button type="primary" icon={<RocketOutlined />} onClick={handleSubmitPublish}>
                          {publishIsNew
                            ? (publishType === "skill" ? "发布新 Skill" : "发布新 Agent")
                            : (publishType === "skill" ? "发布新版本到 Skill 广场" : "发布新版本到 Agent Store")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── 进化聊天面板 ── */
              <div className={styles.evolutionChat}>
                <div className={styles.evolutionChatHeader}>
                  <h3 className={styles.evolutionChatTitle}>Agent 进化</h3>
                  <Button size="small" type="text" icon={<CloseOutlined />} onClick={handleExitEvolution} />
                </div>

                <div className={styles.evolutionChatBody} ref={evoChatBodyRef}>
                  {/* 欢迎 + 企业选择 */}
                  <div className={styles.chatBubbleSystem}>
                    欢迎使用 Agent 进化能力，请先选择要基于哪些企业客户的回流数据进行进化。
                  </div>

                  <div className={styles.enterpriseSelect}>
                    <span className={styles.enterpriseSelectLabel}>选择回流数据源</span>
                    <div className={styles.enterpriseCheckList}>
                      <label className={styles.enterpriseCheckItem}>
                        <input type="checkbox" checked={selectedEnterprises.size === enterpriseList.length} onChange={handleSelectAllEnterprises} />
                        全选
                      </label>
                      {enterpriseList.map(name => (
                        <label key={name} className={styles.enterpriseCheckItem}>
                          <input type="checkbox" checked={selectedEnterprises.has(name)} onChange={() => handleToggleEnterprise(name)} />
                          {name}
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({enterpriseGroups[name].length} 条)</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedEnterprises.size > 0 && evoPhase === "idle" && (
                    <div className={styles.chatBubbleAssistant}>
                      已选择 {selectedEnterprises.size} 个企业客户的回流数据。查询到以下几项内容待进化，请确认是否进行？
                    </div>
                  )}

                  {/* 阶段: suggestions */}
                  {evoPhase !== "idle" && (
                    <>
                      <div className={styles.chatBubbleAssistant}>
                        已选择 {selectedEnterprises.size} 个企业客户的回流数据，分析完成。
                      </div>
                      <div className={styles.evoSuggestionCard}>
                        <h4 className={styles.evoSuggestionTitle}>SKILL 进化建议</h4>
                        {EVOLUTION_SUGGESTIONS.map((s, i) => (
                          <div key={i} className={styles.evoSuggestionItem}>
                            <span className={styles.evoSuggestionDot} />
                            <div className={styles.evoSuggestionContent}>
                              <h5 className={styles.evoSuggestionName}>{s.title}</h5>
                              <span className={styles.evoSuggestionScope}>⚠ 影响范围：{s.scope}</span>
                              <p className={styles.evoSuggestionDesc}>{s.desc}</p>
                            </div>
                          </div>
                        ))}
                        {evoPhase === "suggestions" && (
                          <Button type="primary" block icon={<ToolOutlined />} className={styles.evoExecuteBtn} onClick={handleExecuteEvolution}>
                            执行进化
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {/* 阶段: progress */}
                  {(evoPhase === "progress" || evoPhase === "lineage") && (
                    <>
                      <div className={styles.chatBubbleSystem}>元进化智能体回流到以下数据。</div>
                      <div className={styles.evoProgressCard}>
                        <div className={styles.evoProgressHeader}>
                          <LoadingOutlined spin style={{ color: "#3cbf7b", fontSize: 18 }} />
                          <h4 className={styles.evoProgressTitle}>进化进度</h4>
                        </div>
                        {PROGRESS_STEPS.map((step, i) => (
                          <div key={step} className={styles.evoProgressRow}>
                            <span className={styles.evoProgressLabel}>{step}</span>
                            <div className={styles.evoProgressBar}>
                              <div className={styles.evoProgressBarFill} style={{ width: i < progressCompleted ? "100%" : "0%" }} />
                            </div>
                            <span className={styles.evoProgressPct}>{i < progressCompleted ? "100%" : "0%"}</span>
                          </div>
                        ))}
                      </div>
                      <div className={styles.evoEvalCard}>
                        <div className={styles.evoEvalHeader}>
                          <span className={styles.evoEvalIcon}>📋</span>
                          <h4 className={styles.evoEvalTitle}>评测集</h4>
                        </div>
                        <div className={styles.evoEvalRow}><span>评测集ID</span><span>{EVAL_SET_MOCK.id}</span></div>
                        <div className={styles.evoEvalRow}><span>评测通过率</span><span className={styles.evoEvalHighlight}>{EVAL_SET_MOCK.passRate}</span></div>
                        <div className={styles.evoEvalRow}><span>评测时间</span><span>{EVAL_SET_MOCK.time}</span></div>
                      </div>
                    </>
                  )}

                  {/* 阶段: lineage */}
                  {evoPhase === "lineage" && (
                    <>
                      <div className={styles.evoLineageCard}>
                        <div className={styles.evoLineageHeader}>
                          <span className={styles.evoLineageIcon}>🔗</span>
                          <h4 className={styles.evoLineageTitle}>版本血缘关系</h4>
                        </div>
                        <div className={styles.evoLineageVersions}>
                          <span className={styles.evoLineageTag} style={{ background: "rgba(0,194,212,0.1)", color: "#00c2d4" }}>V2.0</span>
                          <span style={{ color: "var(--text-muted)" }}>→</span>
                          <span className={styles.evoLineageTag} style={{ background: "rgba(60,191,123,0.1)", color: "#3cbf7b" }}>V2.1</span>
                        </div>
                        <div className={styles.evoEvalRow}><span>版本ID</span><span>Agent V2.1</span></div>
                        <div className={styles.evoEvalRow}><span>父版本</span><span>Agent V2.0</span></div>
                      </div>
                      <button type="button" className={styles.evoViewCompareBtn} onClick={() => setEvoPhase("comparing")}>
                        查看进化对比
                      </button>
                      <RadarChart />
                    </>
                  )}
                </div>

                <div className={styles.evolutionChatFooter}>
                  <Input
                    value={chatInput}
                    placeholder="输入进化指令..."
                    className={styles.chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onPressEnter={handleClickEvolve}
                  />
                  <Button type="primary" icon={<SendOutlined />} disabled={selectedEnterprises.size === 0 || evoPhase !== "idle"} onClick={handleClickEvolve}>
                    进化
                  </Button>
                </div>
              </div>
            )
          ) : viewingReportVersion ? (
            (() => {
              const ver = selectedAgent.versions.find(v => v.version === viewingReportVersion);
              if (!ver?.evalReport) return null;
              return (
                <EvalReportPanel
                  version={ver.version}
                  report={ver.evalReport}
                  onBack={() => setViewingReportVersion(null)}
                />
              );
            })()
          ) : (
            <div className={styles.detailRight}>
              <div className={styles.versionHeader}>
                <h3 className={styles.versionTitle}>版本历史</h3>
                <span className={styles.versionCount}>共 {selectedAgent.versions.length} 个版本</span>
              </div>

              <div className={styles.versionTimeline}>
                {selectedAgent.versions.map((ver, index) => (
                  <div
                    key={ver.version}
                    className={classNames(styles.versionNode, index === 0 && styles.versionNodeLatest)}
                  >
                    <div className={styles.versionDot} />
                    <div
                      className={styles.versionNodeCard}
                      onClick={() =>
                        setExpandedVersion(prev => (prev === ver.version ? null : ver.version))
                      }
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setExpandedVersion(prev => (prev === ver.version ? null : ver.version));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.versionNodeTop}>
                        <span className={styles.versionLabel}>
                          v{ver.version}
                          {index === 0 && <span className={styles.latestTag}>最新</span>}
                        </span>
                        <span className={styles.versionDate}>{ver.publishTime}</span>
                      </div>
                      <p className={styles.versionNote}>{ver.releaseNote}</p>

                      {ver.evalReport && (
                        <Button
                          size="small"
                          type="link"
                          icon={<FileTextOutlined />}
                          className={styles.evalReportBtn}
                          onClick={e => {
                            e.stopPropagation();
                            setViewingReportVersion(ver.version);
                          }}
                        >
                          测评报告
                        </Button>
                      )}

                      {expandedVersion === ver.version && ver.evolution && (
                        <div className={styles.evolutionPanel}>
                          <EvolutionMetrics evo={ver.evolution} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── 列表页 ─── */
  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.tabList}>
          {MARKET_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={classNames(styles.tabButton, activeTab === tab.key && styles.tabButtonActive)}
              onClick={() => { setActiveTab(tab.key); setCategoryFilter("all"); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.topActions}>
          <Input
            allowClear
            value={keyword}
            placeholder="搜索Agent..."
            prefix={<SearchOutlined className={styles.searchIcon} />}
            className={styles.searchInput}
            onChange={e => setKeyword(e.target.value)}
          />
          <Button type="primary" onClick={onNavigateToAgentDev}>
            <PlusOutlined /> 创建Agent
          </Button>
        </div>
      </div>

      <div className={styles.filterBar}>
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat.key}
            type="button"
            className={classNames(styles.filterPill, categoryFilter === cat.key && styles.filterPillActive)}
            onClick={() => setCategoryFilter(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filteredAgents.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description="暂无匹配的 Agent" />
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredAgents.map(agent => (
            <div
              key={agent.id}
              className={styles.agentCard}
              onClick={() => setSelectedAgentId(agent.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedAgentId(agent.id); }
              }}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} style={{ background: agent.iconColor }}>
                  {agent.iconText}
                </div>
                <div className={styles.cardTitleBlock}>
                  <h3 className={styles.cardName}>{agent.name}</h3>
                  <div className={styles.cardMeta}>
                    <span
                      className={styles.agentTypeBadge}
                      style={{
                        background: `color-mix(in srgb, ${AGENT_TYPE_COLOR[agent.agentType]} 12%, transparent)`,
                        color: AGENT_TYPE_COLOR[agent.agentType],
                      }}
                    >
                      {AGENT_TYPE_LABEL[agent.agentType]}
                    </span>
                    <span className={styles.catBadge}>{CAT_LABEL[agent.category]}</span>
                    <span>v{agent.version}</span>
                  </div>
                </div>
              </div>

              <p className={styles.cardDescription}>{agent.description}</p>

              <div className={styles.skillChips}>
                {agent.skills.map(sk => (
                  <span key={sk.skillName} className={styles.skillChip}>{sk.skillName}</span>
                ))}
              </div>

              <div className={styles.tagList}>
                {agent.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
                {activeTab !== "mine" && agent.publisher === CURRENT_USER && (
                  <span className={classNames(styles.shareBadge, styles.shareBadgeMine)}>我创建的</span>
                )}
                {activeTab === "team" && agent.isSharedToMe && (
                  <span className={classNames(styles.shareBadge, styles.shareBadgeToMe)}>共享给我</span>
                )}
                {activeTab === "team" && agent.isSharedByMe && (
                  <span className={classNames(styles.shareBadge, styles.shareBadgeByMe)}>我共享的</span>
                )}
              </div>

              <div className={styles.cardFooter}>
                <span>{agent.publisher}</span>
                <span>{agent.publishTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
