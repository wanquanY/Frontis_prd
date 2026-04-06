import { useMemo, useState } from "react";
import type { MouseEvent } from "react";

import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
  WarningFilled,
} from "@ant-design/icons";
import { Badge, Button, Card, Input, Modal, Select, Tag, Tooltip } from "antd";

import styles from "./FdeAgentStoreView.module.less";

interface FdeAgentStoreViewProps {
  onNavigateToAgentDev?: () => void;
}

// Agent 类型定义
interface Skill {
  name: string;
  type: string;
}

interface Version {
  v: string;
  desc: string;
  date: string;
  cur?: boolean;
}

interface Agent {
  id: number;
  icon: string;
  name: string;
  version: string;
  domain: string;
  domainName: string;
  productLine: string;
  type: "universal" | "enterprise";
  typeName?: string;
  status: "online" | "offline" | "pending" | "ready" | "rejected";
  source: string;
  submitTime: string;
  skills: Skill[];
  installCount: number;
  activeOrgs: number;
  rating: number;
  scan: "pass" | "warn" | "block";
  versions: Version[];
  desc: string;
  scene?: string;
  techShape?: string;
  model?: string;
  runtime?: string;
  rejectReason?: string;
  pendingVersion?: Version & { scan?: string; source?: string };
  rejectedVersions?: (Version & { rejectReason?: string })[];
}

type AgentStatus = "all" | "online" | "offline" | "pending" | "ready" | "rejected";
type AgentType = "universal" | "enterprise";

// 模拟数据
const AGENTS: Agent[] = [
  {
    id: 1,
    icon: "💬",
    name: "销售话术助手",
    version: "v1.2.0",
    domain: "sales",
    domainName: "销售",
    productLine: "领衔",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "FDE-张三",
    submitTime: "2026-04-01 09:30",
    skills: [
      { name: "客户意图识别", type: "knowledge" },
      { name: "话术生成引擎", type: "creative" },
      { name: "历史数据检索", type: "knowledge" },
    ],
    installCount: 128,
    activeOrgs: 23,
    rating: 4.7,
    scan: "pass",
    versions: [
      { v: "v1.2.0", desc: "新增行业话术模板库", date: "2026-04-15", cur: true },
      { v: "v1.1.0", desc: "优化意图识别准确率", date: "2026-04-08", cur: false },
      { v: "v1.0.0", desc: "首版发布", date: "2026-04-01", cur: false },
    ],
    desc: "根据客户画像与历史沟通记录，实时生成个性化销售话术与应对策略，提升转化率与客户满意度。",
    scene: "销售沟通",
    techShape: "对话型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    pendingVersion: { v: "v1.3.0", desc: "新增多语言话术支持与情感分析", date: "2026-04-16", source: "FDE-张三", scan: "pass" },
  },
  {
    id: 2,
    icon: "🔔",
    name: "商机跟进提醒",
    version: "v1.0.5",
    domain: "sales",
    domainName: "销售",
    productLine: "领衔",
    type: "enterprise",
    typeName: "深度专业",
    status: "online",
    source: "FDE-张三",
    submitTime: "2026-03-28 14:20",
    skills: [
      { name: "商机监控", type: "trigger" },
      { name: "消息推送", type: "linked" },
    ],
    installCount: 56,
    activeOrgs: 2,
    rating: 4.5,
    scan: "pass",
    versions: [
      { v: "v1.0.5", desc: "修复提醒延迟问题", date: "2026-04-10", cur: true },
      { v: "v1.0.0", desc: "首版发布", date: "2026-04-01", cur: false },
    ],
    desc: "自动追踪销售漏斗各阶段商机，根据停留时长智能推送跟进提醒，避免商机流失。",
    scene: "商机管理",
    techShape: "触发型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 3,
    icon: "📦",
    name: "项目交付助手",
    version: "v2.0.0",
    domain: "delivery",
    domainName: "生产",
    productLine: "远见",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "FDE-李四",
    submitTime: "2026-03-25 10:00",
    skills: [
      { name: "项目进度分析", type: "knowledge" },
      { name: "周报生成", type: "creative" },
    ],
    installCount: 203,
    activeOrgs: 34,
    rating: 4.8,
    scan: "pass",
    versions: [
      { v: "v2.0.0", desc: "重大更新：新增风险预警", date: "2026-04-12", cur: true },
      { v: "v1.5.0", desc: "优化周报格式", date: "2026-04-05", cur: false },
    ],
    desc: "智能追踪项目里程碑与任务进度，自动生成周报与风险预警，帮助 PM 高效管理交付节奏。",
    scene: "项目管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 4,
    icon: "🏢",
    name: "广州联创CRM集成",
    version: "v1.0.0",
    domain: "sales",
    domainName: "销售",
    productLine: "领衔",
    type: "enterprise",
    typeName: "深度专业",
    status: "online",
    source: "FDE-王五",
    submitTime: "2026-04-01 11:00",
    skills: [
      { name: "CRM API对接", type: "script" },
      { name: "数据同步", type: "linked" },
    ],
    installCount: 5,
    activeOrgs: 1,
    rating: 4.9,
    scan: "pass",
    versions: [
      { v: "v1.0.0", desc: "首版发布（私有）", date: "2026-04-10", cur: true },
    ],
    desc: "专为广州联创科技定制的CRM系统集成Agent，支持客户数据自动同步和销售流程自动化。",
    scene: "系统集成",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "企业Runtime",
  },
  {
    id: 5,
    icon: "📋",
    name: "合同审查助手",
    version: "v1.1.0",
    domain: "procurement",
    domainName: "供应",
    productLine: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "FDE-赵六",
    submitTime: "2026-03-30 16:00",
    skills: [
      { name: "合同风险识别", type: "knowledge" },
      { name: "条款提取", type: "script" },
    ],
    installCount: 34,
    activeOrgs: 8,
    rating: 4.4,
    scan: "warn",
    versions: [
      { v: "v1.1.0", desc: "优化风险识别准确率", date: "2026-04-11", cur: true },
    ],
    desc: "智能识别合同中的风险条款，自动提取关键日期、金额与义务，生成审核摘要。",
    scene: "合同审核",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 6,
    icon: "🚚",
    name: "深圳鼎盛物流调度",
    version: "v1.0.0",
    domain: "delivery",
    domainName: "生产",
    productLine: "远见",
    type: "enterprise",
    typeName: "深度专业",
    status: "online",
    source: "FDE-李四",
    submitTime: "2026-03-29 09:00",
    skills: [
      { name: "路径优化", type: "script" },
      { name: "调度触发", type: "trigger" },
    ],
    installCount: 3,
    activeOrgs: 1,
    rating: 4.6,
    scan: "pass",
    versions: [
      { v: "v1.0.0", desc: "首版发布（私有）", date: "2026-04-08", cur: true },
    ],
    desc: "专为深圳鼎盛物流定制的智能调度Agent，优化配送路线和车辆调度，提升物流效率。",
    scene: "物流调度",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "企业Runtime",
  },
  {
    id: 7,
    icon: "📊",
    name: "每日工作简报",
    version: "v1.4.0",
    domain: "management",
    domainName: "通用",
    productLine: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "FDE-张三",
    submitTime: "2026-03-20 08:00",
    skills: [
      { name: "信息聚合", type: "knowledge" },
      { name: "简报生成", type: "creative" },
    ],
    installCount: 312,
    activeOrgs: 45,
    rating: 4.9,
    scan: "pass",
    versions: [
      { v: "v1.4.0", desc: "新增自定义模板", date: "2026-04-13", cur: true },
      { v: "v1.3.0", desc: "优化聚合逻辑", date: "2026-04-06", cur: false },
    ],
    desc: "自动汇聚多渠道工作信息，每日定时生成结构化工作简报，支持自定义模板。",
    scene: "办公效率",
    techShape: "创作型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 8,
    icon: "🎙️",
    name: "会议纪要助手",
    version: "v1.2.0",
    domain: "management",
    domainName: "通用",
    productLine: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "FDE-王五",
    submitTime: "2026-03-22 14:00",
    skills: [
      { name: "录音转写", type: "knowledge" },
      { name: "纪要生成", type: "creative" },
    ],
    installCount: 178,
    activeOrgs: 28,
    rating: 4.7,
    scan: "pass",
    versions: [
      { v: "v1.2.0", desc: "优化转写准确率", date: "2026-04-09", cur: true },
    ],
    desc: "实时转写会议录音，自动提取决策事项与行动计划，生成结构化会议纪要。",
    scene: "会议管理",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 9,
    icon: "🔍",
    name: "客户需求分析",
    version: "v1.3.0",
    domain: "sales",
    domainName: "销售",
    productLine: "领衔",
    type: "universal",
    typeName: "通用职能",
    status: "pending",
    source: "FDE-张三",
    submitTime: "2026-04-01 15:30",
    skills: [
      { name: "需求提取", type: "knowledge" },
      { name: "报告生成", type: "creative" },
    ],
    installCount: 0,
    activeOrgs: 0,
    rating: 0,
    scan: "pass",
    versions: [
      { v: "v1.3.0", desc: "新增行业知识库", date: "2026-04-14", cur: true },
    ],
    desc: "通过多轮对话采集客户需求，结合行业知识库自动生成需求分析报告与优先级建议。",
    scene: "需求分析",
    techShape: "对话型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 10,
    icon: "🤖",
    name: "智能客服助手",
    version: "v2.1.0",
    domain: "service",
    domainName: "服务",
    productLine: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "ready",
    source: "FDE-李四",
    submitTime: "2026-04-02 10:30",
    skills: [
      { name: "意图识别", type: "knowledge" },
      { name: "知识库问答", type: "knowledge" },
      { name: "工单创建", type: "linked" },
    ],
    installCount: 0,
    activeOrgs: 0,
    rating: 0,
    scan: "warn",
    versions: [
      { v: "v2.1.0", desc: "优化多轮对话体验", date: "2026-04-12", cur: true },
    ],
    desc: "7×24小时智能客服，支持多轮对话、知识库检索与工单自动创建。",
    scene: "客户服务",
    techShape: "对话型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 11,
    icon: "📈",
    name: "销售预测分析",
    version: "v1.0.0",
    domain: "sales",
    domainName: "销售",
    productLine: "领衔",
    type: "enterprise",
    typeName: "深度专业",
    status: "offline",
    source: "FDE-张三",
    submitTime: "2026-03-15 09:00",
    skills: [
      { name: "数据分析", type: "script" },
      { name: "预测模型", type: "knowledge" },
    ],
    installCount: 12,
    activeOrgs: 1,
    rating: 4.2,
    scan: "pass",
    versions: [
      { v: "v1.0.0", desc: "首版发布", date: "2026-03-15", cur: true },
    ],
    desc: "基于历史销售数据与市场趋势，智能预测未来销售业绩与关键驱动因素。",
    scene: "数据分析",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "企业Runtime",
  },
  {
    id: 12,
    icon: "🔐",
    name: "权限审批助手",
    version: "v1.2.0",
    domain: "management",
    domainName: "通用",
    productLine: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "FDE-赵六",
    submitTime: "2026-03-18 14:00",
    skills: [
      { name: "权限检查", type: "script" },
      { name: "审批流", type: "workflow" },
    ],
    installCount: 89,
    activeOrgs: 15,
    rating: 4.6,
    scan: "pass",
    versions: [
      { v: "v1.2.0", desc: "新增批量审批", date: "2026-04-08", cur: true },
    ],
    desc: "自动处理权限申请，智能校验合规性并推送审批流。",
    scene: "权限管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
  },
  {
    id: 13,
    icon: "📊",
    name: "数据报表生成器",
    version: "v1.0.0",
    domain: "management",
    domainName: "通用",
    productLine: "通用",
    type: "enterprise",
    typeName: "深度专业",
    status: "rejected",
    source: "FDE-赵六",
    submitTime: "2026-04-05 16:30",
    skills: [
      { name: "数据查询", type: "script" },
      { name: "报表渲染", type: "creative" },
    ],
    installCount: 0,
    activeOrgs: 0,
    rating: 0,
    scan: "block",
    versions: [
      { v: "v1.0.0", desc: "首版提交", date: "2026-04-05", cur: true },
    ],
    desc: "自动生成业务数据报表，支持多种图表类型与导出格式。",
    scene: "数据报表",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    rejectReason: "存在数据安全风险，请完善权限校验机制后再提交",
  },
];

// 性能维度配置（12维）
const PERFORMANCE_DIMENSIONS = [
  { key: "skillAccuracy", label: "Skill触发准确率", color: "#6366f1", unit: "%" },
  { key: "boundaryError", label: "边界测试错误触发率", color: "#ef4444", unit: "%" },
  { key: "taskCompletion", label: "任务完成行为率", color: "#10b981", unit: "%" },
  { key: "toolSuccess", label: "工具调用成功率", color: "#06b6d4", unit: "%" },
  { key: "resultQuality", label: "结果质量评分", color: "#8b5cf6", unit: "分" },
  { key: "executionTime", label: "执行耗时", color: "#f59e0b", unit: "s" },
  { key: "problemSolve", label: "问题解决率", color: "#14b8a6", unit: "%" },
  { key: "userSatisfaction", label: "用户显式满意度", color: "#ec4899", unit: "%" },
  { key: "changeRadius", label: "变更影响半径", color: "#f97316", unit: "分" },
  { key: "tokenUsage", label: "Token消耗量", color: "#84cc16", unit: "tok" },
  { key: "regressionKeep", label: "回归基准保持率", color: "#22c55e", unit: "%" },
  { key: "securityRisk", label: "安全风险", color: "#f43f5e", unit: "分" },
];

// 风险维度
const RISK_DIMENSIONS = [
  { key: "dataSecurity", label: "数据安全" },
  { key: "contentSafety", label: "内容安全" },
  { key: "toolBoundary", label: "工具边界" },
  { key: "codeQuality", label: "代码质量" },
  { key: "exceptionHandle", label: "异常处理" },
  { key: "logDesensitization", label: "日志脱敏" },
];

// 技能类型名称映射
const skillTypeName = (type: string): string => {
  const map: Record<string, string> = {
    knowledge: "知识型",
    creative: "创作型",
    script: "脚本型",
    trigger: "触发型",
    linked: "联动型",
    workflow: "工作流型",
  };
  return map[type] || type;
};

// 生成趋势序列
function getTrendSeries(baseValue: number, spread: number, reverse: boolean): number[] {
  const trend: number[] = [];
  for (let i = 0; i < 5; i++) {
    const noise = (Math.random() - 0.5) * spread;
    let value = baseValue + noise;
    if (reverse) {
      value = baseValue - noise;
    }
    trend.push(Math.max(0, Math.round(value * 10) / 10));
  }
  return trend;
}

// 获取性能数据（12维）
function getPerformanceData(agent: Agent) {
  const baseScore = agent.rating > 0 ? Math.round(agent.rating * 20) : 75;
  const versionDelta = agent.version.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 7;
  const installFactor = Math.min(16, Math.round((agent.installCount || 0) / 20));
  const ratingFactor = agent.rating ? Math.round(agent.rating * 4) : 15;

  const raw = {
    skillAccuracy: Math.min(98, baseScore + 4 + installFactor),
    boundaryError: Math.max(2, 18 - versionDelta - installFactor),
    taskCompletion: Math.min(99, baseScore + 2),
    toolSuccess: Math.min(99, baseScore + 5 + installFactor),
    resultQuality: Math.min(98, baseScore + 3),
    executionTime: Math.max(1.2, Number((8.6 - baseScore / 15 - installFactor * 0.25).toFixed(1))),
    problemSolve: Math.min(98, baseScore + 1 + installFactor),
    userSatisfaction: Math.min(97, ratingFactor + (agent.status === "online" ? 58 : 48) + installFactor),
    changeRadius: Math.max(8, 28 - installFactor - versionDelta),
    tokenUsage: Math.max(1800, Math.round(3600 + baseScore * 42 + installFactor * 120)),
    regressionKeep: Math.min(99, baseScore + 6),
    securityRisk: Math.max(28, 88 - versionDelta * 3 - installFactor * 2 - (agent.scan === "block" ? 38 : agent.scan === "warn" ? 18 : 0)),
  };

  const metrics = PERFORMANCE_DIMENSIONS.map((dim) => {
    const value = raw[dim.key as keyof typeof raw];
    const reverse = dim.key === "boundaryError" || dim.key === "executionTime" || dim.key === "changeRadius" || dim.key === "tokenUsage";
    const spread = dim.key === "tokenUsage" ? 120 : dim.key === "executionTime" ? 0.25 : 2;
    const trend = getTrendSeries(value, spread, reverse);
    const lastValue = trend[trend.length - 1];
    const firstValue = trend[0];
    const diff = ((lastValue - firstValue) / Math.max(Math.abs(firstValue), 1)) * 100;

    return {
      ...dim,
      value,
      displayValue: dim.key === "tokenUsage" ? `${Math.round(value)} tok` : dim.key === "executionTime" ? `${value}s` : `${Math.round(value)}${dim.unit}`,
      trend,
      delta: Math.abs(diff).toFixed(1),
      up: diff > 0.5,
      down: diff < -0.5,
      flat: Math.abs(diff) <= 0.5,
    };
  });

  // 计算综合评分（基于前6个核心指标）
  const coreMetrics = metrics.slice(0, 6);
  const score = Math.round(coreMetrics.reduce((acc, m) => acc + m.value, 0) / coreMetrics.length);

  return { metrics, score };
}

// 获取风险数据
function getRiskData(agent: Agent) {
  const riskMap: Record<string, { level: string; tone: string; summary: string }> = {
    pass: { level: "低风险", tone: "scan-pass", summary: "未发现高危问题，建议按月复核关键风险维度。" },
    warn: { level: "中风险", tone: "scan-warn", summary: "存在中等风险项，建议上架前补充人工复核与灰度验证。" },
    block: { level: "高风险", tone: "scan-block", summary: "检测到高风险项，需完成整改后重新提交审核。" },
  };
  const risk = riskMap[agent.scan] || riskMap.warn;

  const dimMap: Record<string, string[]> = {
    pass: ["低风险", "低风险", "低风险", "低风险", "低风险", "中风险"],
    warn: ["中风险", "中风险", "低风险", "中风险", "中风险", "中风险"],
    block: ["高风险", "高风险", "中风险", "高风险", "中风险", "高风险"],
  };

  return {
    ...risk,
    dims: RISK_DIMENSIONS.map((dim, idx) => ({ label: dim.label, level: (dimMap[agent.scan] || dimMap.warn)[idx] })),
  };
}

// 渲染雷达图 - 与0405.html一致
function renderRadarChart(metrics: { label: string; value: number }[]): string {
  const cx = 170, cy = 150, maxR = 96;
  const dims = metrics.slice(0, 6);

  // 背景圆环
  const rings = [25, 50, 75, 100]
    .map((level) => {
      const r = maxR * (level / 100);
      const points = dims
        .map((_, i) => {
          const angle = -Math.PI / 2 + (i * Math.PI * 2) / dims.length;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return `<polygon fill="none" stroke="rgba(148,163,184,0.25)" stroke-width="1" points="${points}"/>`;
    })
    .join("");

  // 轴线
  const axes = dims
    .map((d, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / dims.length;
      const x = (cx + Math.cos(angle) * maxR).toFixed(1);
      const y = (cy + Math.sin(angle) * maxR).toFixed(1);
      const lx = (cx + Math.cos(angle) * (maxR + 24)).toFixed(1);
      const ly = (cy + Math.sin(angle) * (maxR + 24)).toFixed(1);
      return `<line stroke="rgba(148,163,184,0.35)" stroke-width="1" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text fill="#94a3b8" font-size="11" text-anchor="middle" x="${lx}" y="${ly}">${d.label}</text>`;
    })
    .join("");

  // 数据区域
  const areaPoints = dims
    .map((d, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / dims.length;
      const r = maxR * (Math.min(99, Math.max(8, d.value)) / 100);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // 数据点
  const pointDots = dims
    .map((d, i) => {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / dims.length;
      const r = maxR * (Math.min(99, Math.max(8, d.value)) / 100);
      const x = (cx + Math.cos(angle) * r).toFixed(1);
      const y = (cy + Math.sin(angle) * r).toFixed(1);
      return `<circle fill="#818cf8" stroke="#fff" stroke-width="1.5" cx="${x}" cy="${y}" r="4"/>`;
    })
    .join("");

  return `<div style="display:flex;justify-content:center;align-items:center;padding:8px 0 16px;"><svg style="width:100%;max-width:340px;height:auto;overflow:visible;" viewBox="0 0 340 300">${rings}${axes}<polygon fill="rgba(79,70,229,0.18)" stroke="#6366f1" stroke-width="2" points="${areaPoints}"/>${pointDots}</svg></div>`;
}

export const FdeAgentStoreView = ({
  onNavigateToAgentDev,
}: FdeAgentStoreViewProps): JSX.Element => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus>("all");
  const [typeFilter, setTypeFilter] = useState<AgentType | "">("");
  const [productLineFilter, setProductLineFilter] = useState<string>("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<string>("");
  const [reviewRejectReason, setReviewRejectReason] = useState<string>("");
  const [reviewRejectCode, setReviewRejectCode] = useState<string>("");
  const [reviewNote, setReviewNote] = useState<string>("");

  // 计算性能数据
  const performanceData = useMemo(() => {
    if (!selectedAgent) return null;
    return getPerformanceData(selectedAgent);
  }, [selectedAgent]);

  // 计算风险数据
  const riskData = useMemo(() => {
    if (!selectedAgent) return null;
    return getRiskData(selectedAgent);
  }, [selectedAgent]);

  // 过滤 Agent 列表
  const filteredAgents = useMemo(() => {
    return AGENTS.filter((agent) => {
      if (statusFilter !== "all" && agent.status !== statusFilter) return false;
      if (typeFilter && agent.type !== typeFilter) return false;
      if (productLineFilter && agent.productLine !== productLineFilter) return false;
      if (domainFilter !== "all" && agent.domain !== domainFilter) return false;
      if (
        searchKeyword &&
        !agent.name.toLowerCase().includes(searchKeyword.toLowerCase()) &&
        !agent.source.toLowerCase().includes(searchKeyword.toLowerCase())
      )
        return false;
      return true;
    });
  }, [statusFilter, typeFilter, productLineFilter, domainFilter, searchKeyword]);

  // 状态统计
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: AGENTS.length,
      online: 0,
      offline: 0,
      pending: 0,
      ready: 0,
      rejected: 0,
    };
    AGENTS.forEach((a) => {
      counts[a.status]++;
    });
    return counts;
  }, []);

  // 打开详情
  const openDetail = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDetailModalOpen(true);
  };

  // 打开性能报告
  const openBenchmark = (e: MouseEvent<HTMLButtonElement>, agent: Agent) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setIsBenchmarkModalOpen(true);
  };

  // 打开风险评估
  const openRiskReport = (e: MouseEvent<HTMLButtonElement>, agent: Agent) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setIsRiskModalOpen(true);
  };

  // 打开审核对话框
  const openReview = (e: MouseEvent<HTMLButtonElement>, agent: Agent) => {
    e.stopPropagation();
    setSelectedAgent(agent);
    setReviewDecision("");
    setReviewRejectReason("");
    setReviewRejectCode("");
    setReviewNote("");
    setIsReviewModalOpen(true);
  };

  // 获取操作按钮
  const getActionButtons = (agent: Agent) => {
    const buttons = [];
    if (agent.status === "pending") {
      buttons.push(
        <button key="review" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXs}`} onClick={(e) => openReview(e, agent)}>
          审核
        </button>
      );
    }
    if (agent.status === "ready" || agent.status === "offline") {
      buttons.push(
        <button key="publish" className={`${styles.btn} ${styles.btnSuccess} ${styles.btnXs}`}>
          上架
        </button>
      );
    }
    if (agent.status === "online") {
      // 如果有待审核版本，显示审核按钮
      if (agent.pendingVersion) {
        buttons.push(
          <button key="review" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXs}`} onClick={(e) => openReview(e, agent)}>
            审核
          </button>
        );
      }
      buttons.push(
        <button key="offline" className={`${styles.btn} ${styles.btnWarning} ${styles.btnXs}`}>
          下架
        </button>
      );
    }
    if (agent.status === "rejected") {
      buttons.push(
        <button key="reason" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`}>
          查看原因
        </button>
      );
    }
    return buttons;
  };

  // 状态标签
  const statusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      online: { color: "success", text: "已上架" },
      offline: { color: "default", text: "已下架" },
      pending: { color: "warning", text: "待审核" },
      ready: { color: "processing", text: "待上架" },
    };
    const config = map[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 类型标签
  const typeTag = (type: string) => {
    return type === "universal" ? (
      <span style={{ color: "#3b82f6", fontSize: 12 }}>🌐 公开</span>
    ) : (
      <span style={{ color: "#8b5cf6", fontSize: 12 }}>🏢 我的</span>
    );
  };

  // 风险扫描标签
  const scanTag = (scan: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pass: { color: "#10b981", text: "已通过" },
      warn: { color: "#f59e0b", text: "有警告" },
      block: { color: "#ef4444", text: "被阻断" },
    };
    const config = map[scan] || { color: "#6b7280", text: scan };
    return (
      <span style={{ color: config.color, fontSize: 12, fontWeight: 600 }}>{config.text}</span>
    );
  };

  // 技能类型标签
  const skillTypeTag = (type: string) => {
    const map: Record<string, { bg: string; color: string; text: string }> = {
      knowledge: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", text: "知识型" },
      creative: { bg: "rgba(236,72,153,0.1)", color: "#db2777", text: "创作型" },
      script: { bg: "rgba(245,158,11,0.1)", color: "#d97706", text: "脚本型" },
      trigger: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", text: "触发型" },
      linked: { bg: "rgba(99,102,241,0.1)", color: "#6366f1", text: "联动型" },
      workflow: { bg: "rgba(20,184,166,0.1)", color: "#14b8a6", text: "工作流型" },
    };
    const config = map[type] || { bg: "rgba(107,114,128,0.1)", color: "#6b7280", text: type };
    return (
      <span
        style={{
          background: config.bg,
          color: config.color,
          fontSize: 10,
          padding: "1px 6px",
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        {config.text}
      </span>
    );
  };

  return (
    <div className={styles.root}>
      {/* 搜索框 */}
      <div className={styles.searchBox}>
        <SearchOutlined className={styles.searchIcon} />
        <input
          type="text"
          placeholder="搜索 Agent 名称、来源..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* 筛选栏 */}
      <div className={styles.filterBar}>
        {/* 状态筛选标签 */}
        <div className={styles.filterTabs}>
          {[
            { key: "all", label: "全部", count: statusCounts.all, color: "" },
            { key: "pending", label: "待审核", count: statusCounts.pending, color: "#f59e0b" },
            { key: "rejected", label: "审核驳回", count: statusCounts.rejected, color: "#f87171" },
            { key: "ready", label: "待上架", count: statusCounts.ready, color: "#3b82f6" },
            { key: "online", label: "已上架", count: statusCounts.online, color: "#10b981" },
            { key: "offline", label: "已下架", count: statusCounts.offline, color: "var(--text-soft)" },
          ].map((tab) => (
            <div
              key={tab.key}
              className={`${styles.filterTab} ${statusFilter === tab.key ? styles.filterTabActive : ""}`}
              onClick={() => setStatusFilter(tab.key as AgentStatus)}
            >
              {tab.label} <span className={styles.filterCount} style={{ color: tab.color || "inherit", opacity: tab.color ? 1 : 0.5 }}>{tab.count}</span>
            </div>
          ))}
        </div>

        {/* 类型筛选标签 */}
        <div className={styles.filterTabs}>
          <div
            className={`${styles.filterTab} ${typeFilter === "" ? styles.filterTabActive : ""}`}
            onClick={() => setTypeFilter("")}
          >
            全部
          </div>
          <div
            className={`${styles.filterTab} ${typeFilter === "universal" ? styles.filterTabActive : ""}`}
            onClick={() => setTypeFilter("universal")}
          >
            🌐 公开
          </div>
          <div
            className={`${styles.filterTab} ${typeFilter === "enterprise" ? styles.filterTabActive : ""}`}
            onClick={() => setTypeFilter("enterprise")}
          >
            🏢 我的
          </div>
        </div>

        {/* 产品线下拉框 */}
        <select
          className={styles.filterSelect}
          value={productLineFilter}
          onChange={(e) => setProductLineFilter(e.target.value)}
        >
          <option value="">全部产品线</option>
          <option value="领衔">领衔</option>
          <option value="远见">远见</option>
          <option value="通用">通用</option>
        </select>

        {/* 板块下拉框 */}
        <select
          className={styles.filterSelect}
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
        >
          <option value="all">全部板块</option>
          <option value="sales">销售</option>
          <option value="delivery">生产</option>
          <option value="procurement">供应</option>
          <option value="management">通用</option>
        </select>

        {/* 创建按钮 */}
        <button className={styles.createBtn} onClick={onNavigateToAgentDev}>
          <PlusOutlined /> 创建Agent
        </button>
      </div>

      {/* Agent 卡片网格 */}
      <div className={styles.agentGrid}>
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className={`${styles.agentCard} ${agent.type === "enterprise" ? styles.agentCardEnterprise : ""}`}
            onClick={() => openDetail(agent)}
          >
            {/* 卡片头部 */}
            <div className={styles.agentCardTop}>
              <div className={styles.agentEmoji}>{agent.icon}</div>
              <div className={styles.agentMeta}>
                <div className={styles.agentTitle}>
                  {agent.name}
                  <span className={`${styles.tag} ${agent.type === "enterprise" ? styles.tagEnterprise : styles.tagUniversal}`}>
                    {agent.type === "enterprise" ? "🏢 我的" : "🌐 公开"}
                  </span>
                </div>
                <div className={styles.agentSub}>
                  <span className={styles.tagDomain}>{agent.domainName}</span>
                  <span style={{ color: "var(--text-faint)" }}>{agent.version}</span>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>{statusTag(agent.status)}</div>
            </div>

            {/* 描述 */}
            <div className={styles.agentDesc}>{agent.desc}</div>

            {/* 技能标签 */}
            <div className={styles.skillsContainer}>
              {agent.skills.slice(0, 3).map((skill, idx) => (
                <span key={idx} className={styles.skillChip}>
                  {skillTypeTag(skill.type)}
                  <span style={{ marginLeft: 4 }}>{skill.name}</span>
                </span>
              ))}
            </div>

            {/* 底部信息 */}
            <div className={styles.agentFooter}>
              <div className={styles.agentInstall}>
                {agent.status === "online" ? (
                  <span>价值覆盖 {agent.activeOrgs} 家企业 · 授权拉取 {agent.installCount} 次</span>
                ) : (
                  <span className={styles.sourceText}>来源：{agent.source}</span>
                )}
              </div>
              <div className={styles.agentBtns}>{getActionButtons(agent)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 详情弹窗 */}
      <Modal
        title={selectedAgent ? `${selectedAgent.icon} ${selectedAgent.name}` : "Agent 详情"}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={
          selectedAgent ? (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={() => setIsDetailModalOpen(false)}>关闭</Button>
              {selectedAgent.status === "pending" && (
                <Button type="primary" onClick={() => {
                  setIsDetailModalOpen(false);
                  setReviewDecision("");
                  setReviewRejectReason("");
                  setReviewRejectCode("");
                  setReviewNote("");
                  setIsReviewModalOpen(true);
                }}>去审核</Button>
              )}
              {(selectedAgent.status === "ready" || selectedAgent.status === "offline") && (
                <Button type="primary">🚀 上架</Button>
              )}
              {selectedAgent.status === "online" && (
                <Button danger>下架</Button>
              )}
            </div>
          ) : null
        }
        width={680}
      >
        {selectedAgent && (
          <div className={styles.detailContent}>
            {/* 基础信息 */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>基础信息</div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>名称</div>
                <div className={styles.detailV}>{selectedAgent.icon} {selectedAgent.name}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>开放类型</div>
                <div className={styles.detailV}>{typeTag(selectedAgent.type)}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>Agent类型</div>
                <div className={styles.detailV}>{selectedAgent.typeName || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>业务板块</div>
                <div className={styles.detailV}>{selectedAgent.domainName}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>产品线</div>
                <div className={styles.detailV}>{selectedAgent.productLine || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>业务场景</div>
                <div className={styles.detailV}>{selectedAgent.scene || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>技术形态</div>
                <div className={styles.detailV}>{selectedAgent.techShape || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>绑定模型</div>
                <div className={styles.detailV}>{selectedAgent.model || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>Runtime 类型</div>
                <div className={styles.detailV}>{selectedAgent.runtime || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>状态</div>
                <div className={styles.detailV}>{statusTag(selectedAgent.status)}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>来源</div>
                <div className={styles.detailV} style={{ color: "var(--text-soft)" }}>{selectedAgent.source}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>提交时间</div>
                <div className={styles.detailV} style={{ color: "var(--text-soft)" }}>{selectedAgent.submitTime}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>简介</div>
                <div className={styles.detailV} style={{ color: "var(--text-soft)", lineHeight: 1.6 }}>{selectedAgent.desc}</div>
              </div>
              {selectedAgent.rejectReason && (
                <div className={styles.detailKv}>
                  <div className={styles.detailK}>驳回原因</div>
                  <div className={styles.detailV} style={{ color: "#f87171" }}>{selectedAgent.rejectReason}</div>
                </div>
              )}
            </div>

            {/* 关联 Skill */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>关联 Skill</div>
              <div>
                {selectedAgent.skills.map((skill, idx) => (
                  <span key={idx} className={styles.skillChip}>
                    {skillTypeTag(skill.type)}
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>

            {/* 版本信息 */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>版本信息</div>
              {selectedAgent.pendingVersion && (
                <div className={styles.versionRow} style={{ borderColor: "rgba(217,119,6,0.3)", background: "rgba(217,119,6,0.06)" }}>
                  <span className={styles.versionTag} style={{ color: "var(--yellow)" }}>{selectedAgent.pendingVersion.v}</span>
                  <span className={styles.versionDesc}>{selectedAgent.pendingVersion.desc}</span>
                  <span className={styles.versionDate}>{selectedAgent.pendingVersion.date}</span>
                  <Tag color="warning" style={{ fontSize: 10 }}>待审核</Tag>
                  <span className={styles.benchmarkLink} onClick={() => {
                    setIsDetailModalOpen(false);
                    setReviewDecision("");
                    setReviewRejectReason("");
                    setReviewRejectCode("");
                    setReviewNote("");
                    setIsReviewModalOpen(true);
                  }}>去审核 →</span>
                </div>
              )}
              {selectedAgent.versions.map((v, idx) => (
                <div
                  key={idx}
                  className={styles.versionRow}
                  style={{
                    borderColor: v.cur ? "rgba(99,102,241,0.26)" : "transparent",
                    background: v.cur ? "rgba(99,102,241,0.08)" : "var(--panel-muted)",
                  }}
                >
                  <span className={styles.versionTag}>{v.v}</span>
                  <span className={styles.versionDesc}>{v.desc}</span>
                  <span className={styles.versionDate}>{v.date}</span>
                  {v.cur && <span className={styles.versionCur}>当前版本</span>}
                  {v.cur && (
                    <span
                      className={styles.benchmarkLink}
                      onClick={(e) => openBenchmark(e, selectedAgent)}
                    >
                      📈 性能报告
                    </span>
                  )}
                </div>
              ))}
              {selectedAgent.rejectedVersions?.map((rv, idx) => (
                <div
                  key={idx}
                  className={styles.versionRow}
                  style={{ borderColor: "rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.04)" }}
                >
                  <span className={styles.versionTag} style={{ color: "var(--red)" }}>{rv.v}</span>
                  <span className={styles.versionDesc}>{rv.desc}</span>
                  <span className={styles.versionDate}>{rv.date}</span>
                  <Tag color="error" style={{ fontSize: 10 }}>被驳回</Tag>
                  <span className={styles.benchmarkLink} style={{ color: "#f87171" }}>查看原因</span>
                </div>
              ))}
            </div>

            {/* 运营数据 */}
            {selectedAgent.status === "online" && selectedAgent.installCount > 0 && (
              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>运营数据</div>
                <div className={styles.detailKv}>
                  <div className={styles.detailK}>分发次数</div>
                  <div className={styles.detailV}>{selectedAgent.installCount}</div>
                </div>
                <div className={styles.detailKv}>
                  <div className={styles.detailK}>服务企业</div>
                  <div className={styles.detailV}>{selectedAgent.activeOrgs} 家</div>
                </div>
                <div className={styles.detailKv}>
                  <div className={styles.detailK}>用户评分</div>
                    <div className={styles.detailV}>{selectedAgent.rating > 0 ? `⭐ ${selectedAgent.rating}` : "-"}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 性能报告弹窗 */}
      <Modal
        title={selectedAgent ? `${selectedAgent.icon} ${selectedAgent.name} — 版本性能报告` : "性能报告"}
        open={isBenchmarkModalOpen}
        onCancel={() => setIsBenchmarkModalOpen(false)}
        footer={null}
        width={680}
        style={{ top: 20 }}
      >
        {selectedAgent && performanceData && (
          <div className={styles.benchmarkContent}>
            {/* 当前版本 */}
            <div className={styles.detailSection} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.8 }}>
                当前版本：<span style={{ color: "var(--text-strong)", fontWeight: 600 }}>通用 · {selectedAgent.version}</span>
              </div>
            </div>

            {/* 雷达图 */}
            <div className={styles.detailSection}>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderRadarChart(
                    performanceData.metrics.slice(0, 6).map((m) => ({ label: m.label, value: m.value }))
                  ),
                }}
              />
            </div>

            {/* 性能指标 - 简洁布局 */}
            <div className={styles.perfMetricsSimple}>
              {performanceData.metrics.slice(0, 6).map((metric, idx) => {
                const direction = metric.up ? "up" : metric.down ? "down" : "flat";
                const arrow = metric.up ? "↑" : metric.down ? "↓" : "→";
                return (
                  <div key={idx} className={styles.perfMetricSimpleRow}>
                    <span className={styles.perfMetricSimpleName}>{metric.label}</span>
                    <span className={styles.perfMetricSimpleValue}>
                      <strong>{metric.displayValue}</strong>
                      <span className={`${styles.perfMetricSimpleDelta} ${styles[direction]}`}>
                        {arrow} {metric.delta}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* 风险评估报告弹窗 */}
      <Modal
        title={selectedAgent ? `🛡 ${selectedAgent.name} — 风险评估报告` : "风险评估报告"}
        open={isRiskModalOpen}
        onCancel={() => setIsRiskModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedAgent && riskData && (
          <div className={styles.benchmarkContent}>
            {/* 风险评分 */}
            <div
              className={styles.scoreBar}
              style={{ marginBottom: 20, alignItems: "flex-start" }}
            >
              <div>
                <div className={styles.scoreBig} style={{ fontSize: 34 }}>{riskData.level}</div>
                <div className={styles.scoreLabel}>综合风险结论</div>
              </div>
              <div className={styles.scoreDetails} style={{ maxWidth: 420 }}>
                <span>
                  <strong>{selectedAgent.scan === "pass" ? "建议周期复核" : "建议重点复核"}</strong>
                  {riskData.summary}
                </span>
              </div>
            </div>

            {/* 风险雷达图 */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>风险雷达图</div>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderRadarChart(
                    riskData.dims.map((d) => {
                      const scoreMap: Record<string, number> = { "低风险": 88, "中风险": 63, "高风险": 34 };
                      return { label: d.label, value: scoreMap[d.level] || 50 };
                    })
                  ),
                }}
              />
            </div>

            {/* 复核建议 */}
            <div className={styles.detailSection}>
              <div className={styles.detailSectionTitle}>复核建议</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.8 }}>
                1. 重点检查安全性、敏感内容拦截与工具调用边界配置；<br />
                2. 对代码类 / workflow 类 Agent 补充灰度验证与异常回放；<br />
                3. 上架前确认数据权限、日志脱敏与输出可靠性策略已生效。
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 审核对话框 */}
      <Modal
        title={`新版本审核 — ${selectedAgent?.name || ""}`}
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button onClick={() => setIsReviewModalOpen(false)}>取消</Button>
            <Button type="primary">确认审核</Button>
          </div>
        }
        width={580}
      >
        {selectedAgent && (
          <div className={styles.reviewContent}>
            {/* 新版本推送信息卡片 */}
            <div className={styles.reviewInfoCard}>
              <div className={styles.reviewInfoTitle}>📦 新版本推送信息</div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>Agent</div>
                <div className={styles.detailV}>{selectedAgent.icon} {selectedAgent.name}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>当前版本</div>
                <div className={styles.detailV}>
                  <span className={styles.versionCur}>{selectedAgent.version}</span>
                </div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>推送版本</div>
                <div className={styles.detailV} style={{ fontWeight: 700, color: "var(--primary)" }}>
                  {selectedAgent.pendingVersion?.v || "-"}
                </div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>更新说明</div>
                <div className={styles.detailV}>{selectedAgent.pendingVersion?.desc || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>提交时间</div>
                <div className={styles.detailV}>{selectedAgent.pendingVersion?.date || "-"}</div>
              </div>
              <div className={styles.detailKv}>
                <div className={styles.detailK}>来源</div>
                <div className={styles.detailV}>{selectedAgent.pendingVersion?.source || selectedAgent.source}</div>
              </div>
            </div>

            {/* 运营检测 */}
            <div className={styles.formRow}>
              <label className={styles.formLabel}>运营检测</label>
              <div className={styles.reviewScanBox}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)" }}>✅ 未检测到重复 Agent</div>
                <div style={{ fontSize: 11, color: "var(--text-soft)", marginTop: 4 }}>名称与描述均无重复，可继续审核。</div>
              </div>
            </div>

            {/* 性能评分 */}
            <div className={styles.formRow}>
              <label className={styles.formLabel}>性能评分</label>
              <div className={styles.perfReviewRow}>
                <div>
                  <div className={styles.perfReviewScore}>{performanceData?.score || 75} 分</div>
                  <div className={styles.perfReviewMeta}>12 维版本评测结果</div>
                </div>
                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`}
                  onClick={() => setIsBenchmarkModalOpen(true)}
                >
                  性能报告
                </button>
              </div>
            </div>

            {/* 审核决策 */}
            <div className={styles.formRow}>
              <label className={styles.formLabel}>
                审核决策 <span className={styles.req}>*</span>
              </label>
              <select
                className={styles.formSelect}
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
              >
                <option value="">请选择</option>
                <option value="pass">✅ 审核通过 → 替换当前版本</option>
                <option value="reject">❌ 审核驳回 → 保持当前版本</option>
              </select>
            </div>

            {/* 驳回原因（选择驳回时显示） */}
            {reviewDecision === "reject" && (
              <div className={styles.formRow}>
                <label className={styles.formLabel}>
                  驳回原因 <span className={styles.req}>*</span>
                </label>
                <textarea
                  className={styles.formTextarea}
                  value={reviewRejectReason}
                  onChange={(e) => setReviewRejectReason(e.target.value)}
                  placeholder="请填写驳回原因…"
                />
              </div>
            )}

            {/* 备注（内部） */}
            <div className={styles.formRow}>
              <label className={styles.formLabel}>备注（内部）</label>
              <textarea
                className={styles.formTextarea}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="可选…"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
