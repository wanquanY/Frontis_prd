import { useCallback, useEffect, useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select, Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";

import { getAvatarUrl } from "@/pages/utils";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";
import {
  loadEnterpriseAgentOrders,
  saveEnterpriseAgentOrders,
} from "@/feature/fde/enterpriseAgentOrders";
import type { OperationsAgentSubmission } from "@/feature/operations/types";

import styles from "./FdeAgentStoreView.module.less";

interface FdeAgentStoreViewProps {
  onNavigateToAgentDev?: () => void;
  viewerRole?: "employee" | "admin";
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
  marketScope?: "public" | "tenant" | "team" | "personal";
  priceLabel?: string;
  trialLabel?: string;
  visibilityTargetName?: string;
  sharedBy?: string;
  rejectReason?: string;
  pendingVersion?: Version & { scan?: string; source?: string };
  rejectedVersions?: (Version & { rejectReason?: string })[];
}

type AgentShelfFilter = "all" | "exclusive" | "shared" | "mine";
type BusinessLineFilter = "all" | "general" | "production" | "sales" | "supplyChain";
type AgentDetailTabKey = "basic" | "skills" | "versions" | "operations";
type AgentOrderType = "trial" | "purchase";
type AgentPaymentMethod = "bankTransfer";
type AgentOrderStatus = "awaitingReceipt" | "reviewing" | "awaitingActivation" | "active" | "rejected";
type AgentReceiptStatus = "notRequired" | "notSubmitted" | "submitted" | "confirmed";
type AgentActionKind =
  | "requestPurchase"
  | "requestTrial"
  | "viewOrder"
  | "continuePayment"
  | "addWorkspace"
  | "enterDev"
  | "employeeTrial"
  | "employeeApplyPurchase"
  | "employeeApplyAccess";

interface AgentOrderRecord {
  id: string;
  agentId: number;
  orderNo: string;
  orderType: AgentOrderType;
  status: AgentOrderStatus;
  paymentMethod?: AgentPaymentMethod;
  companyName: string;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  priceLabel: string;
  remark?: string;
  receiptStatus: AgentReceiptStatus;
  receiptFileName?: string;
  receiptSubmittedAt?: string;
  reviewNote?: string;
  expiresAt?: string;
}

interface AgentOrderRequestDraft {
  agentId: number;
  companyName: string;
  contactName: string;
  contactPhone: string;
  orderType: AgentOrderType;
  paymentMethod: AgentPaymentMethod;
  remark: string;
}

interface CommodityApplicationDraft {
  proposedProductName: string;
  reason: string;
}

// 模拟数据
const AGENTS: Agent[] = [
  {
    id: 1,
    icon: "💬",
    name: "销售话术助手",
    version: "v1.2.0",
    domain: "sales",
    domainName: "销售",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "张三",
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
    marketScope: "public",
    priceLabel: "¥6,800 / 年",
    trialLabel: "0元试用",
    pendingVersion: {
      v: "v1.3.0",
      desc: "新增多语言话术支持与情感分析",
      date: "2026-04-16",
      source: "张三",
      scan: "pass",
    },
  },
  {
    id: 2,
    icon: "🔔",
    name: "商机跟进提醒",
    version: "v1.0.5",
    domain: "sales",
    domainName: "销售",
    type: "enterprise",
    typeName: "深度专业",
    status: "online",
    source: "张三",
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
    marketScope: "team",
    sharedBy: "李四",
  },
  {
    id: 3,
    icon: "📦",
    name: "项目交付助手",
    version: "v2.0.0",
    domain: "delivery",
    domainName: "生产",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "李四",
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
    marketScope: "public",
    priceLabel: "¥12,800 / 年",
    trialLabel: "7天试用",
  },
  {
    id: 4,
    icon: "🏢",
    name: "广州联创CRM集成",
    version: "v1.0.0",
    domain: "sales",
    domainName: "销售",
    type: "enterprise",
    typeName: "深度专业",
    status: "online",
    source: "王五",
    submitTime: "2026-04-01 11:00",
    skills: [
      { name: "CRM API对接", type: "script" },
      { name: "数据同步", type: "linked" },
    ],
    installCount: 5,
    activeOrgs: 1,
    rating: 4.9,
    scan: "pass",
    versions: [{ v: "v1.0.0", desc: "首版发布（私有）", date: "2026-04-10", cur: true }],
    desc: "专为广州联创科技定制的CRM系统集成Agent，支持客户数据自动同步和销售流程自动化。",
    scene: "系统集成",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "企业Runtime",
    visibilityTargetName: "广州联创科技",
    priceLabel: "项目报价",
  },
  {
    id: 5,
    icon: "📋",
    name: "合同审查助手",
    version: "v1.1.0",
    domain: "procurement",
    domainName: "供应链",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "赵六",
    submitTime: "2026-03-30 16:00",
    skills: [
      { name: "合同风险识别", type: "knowledge" },
      { name: "条款提取", type: "script" },
    ],
    installCount: 34,
    activeOrgs: 8,
    rating: 4.4,
    scan: "warn",
    versions: [{ v: "v1.1.0", desc: "优化风险识别准确率", date: "2026-04-11", cur: true }],
    desc: "智能识别合同中的风险条款，自动提取关键日期、金额与义务，生成审核摘要。",
    scene: "合同审核",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    marketScope: "public",
    priceLabel: "¥9,800 / 年",
    trialLabel: "3天试用",
  },
  {
    id: 6,
    icon: "🚚",
    name: "深圳鼎盛物流调度",
    version: "v1.0.0",
    domain: "delivery",
    domainName: "生产",
    type: "enterprise",
    typeName: "深度专业",
    status: "online",
    source: "李四",
    submitTime: "2026-03-29 09:00",
    skills: [
      { name: "路径优化", type: "script" },
      { name: "调度触发", type: "trigger" },
    ],
    installCount: 3,
    activeOrgs: 1,
    rating: 4.6,
    scan: "pass",
    versions: [{ v: "v1.0.0", desc: "首版发布（私有）", date: "2026-04-08", cur: true }],
    desc: "专为深圳鼎盛物流定制的智能调度Agent，优化配送路线和车辆调度，提升物流效率。",
    scene: "物流调度",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "企业Runtime",
    visibilityTargetName: "深圳鼎盛物流",
    priceLabel: "项目报价",
  },
  {
    id: 7,
    icon: "📊",
    name: "每日工作简报",
    version: "v1.4.0",
    domain: "management",
    domainName: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "张三",
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
    marketScope: "personal",
  },
  {
    id: 8,
    icon: "🎙️",
    name: "会议纪要助手",
    version: "v1.2.0",
    domain: "management",
    domainName: "通用",
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "王五",
    submitTime: "2026-03-22 14:00",
    skills: [
      { name: "录音转写", type: "knowledge" },
      { name: "纪要生成", type: "creative" },
    ],
    installCount: 178,
    activeOrgs: 28,
    rating: 4.7,
    scan: "pass",
    versions: [{ v: "v1.2.0", desc: "优化转写准确率", date: "2026-04-09", cur: true }],
    desc: "实时转写会议录音，自动提取决策事项与行动计划，生成结构化会议纪要。",
    scene: "会议管理",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    marketScope: "team",
    sharedBy: "王五",
  },
  {
    id: 9,
    icon: "🔍",
    name: "客户需求分析",
    version: "v1.3.0",
    domain: "sales",
    domainName: "销售",
    type: "universal",
    typeName: "通用职能",
    status: "pending",
    source: "张三",
    submitTime: "2026-04-01 15:30",
    skills: [
      { name: "需求提取", type: "knowledge" },
      { name: "报告生成", type: "creative" },
    ],
    installCount: 0,
    activeOrgs: 0,
    rating: 0,
    scan: "pass",
    versions: [{ v: "v1.3.0", desc: "新增行业知识库", date: "2026-04-14", cur: true }],
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
    type: "universal",
    typeName: "通用职能",
    status: "ready",
    source: "李四",
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
    versions: [{ v: "v2.1.0", desc: "优化多轮对话体验", date: "2026-04-12", cur: true }],
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
    type: "enterprise",
    typeName: "深度专业",
    status: "offline",
    source: "张三",
    submitTime: "2026-03-15 09:00",
    skills: [
      { name: "数据分析", type: "script" },
      { name: "预测模型", type: "knowledge" },
    ],
    installCount: 12,
    activeOrgs: 1,
    rating: 4.2,
    scan: "pass",
    versions: [{ v: "v1.0.0", desc: "首版发布", date: "2026-03-15", cur: true }],
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
    type: "universal",
    typeName: "通用职能",
    status: "online",
    source: "赵六",
    submitTime: "2026-03-18 14:00",
    skills: [
      { name: "权限检查", type: "script" },
      { name: "审批流", type: "workflow" },
    ],
    installCount: 89,
    activeOrgs: 15,
    rating: 4.6,
    scan: "pass",
    versions: [{ v: "v1.2.0", desc: "新增批量审批", date: "2026-04-08", cur: true }],
    desc: "自动处理权限申请，智能校验合规性并推送审批流。",
    scene: "权限管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    marketScope: "public",
    priceLabel: "¥5,800 / 年",
    trialLabel: "0元试用",
  },
  {
    id: 13,
    icon: "📊",
    name: "数据报表生成器",
    version: "v1.0.0",
    domain: "management",
    domainName: "通用",
    type: "enterprise",
    typeName: "深度专业",
    status: "rejected",
    source: "赵六",
    submitTime: "2026-04-05 16:30",
    skills: [
      { name: "数据查询", type: "script" },
      { name: "报表渲染", type: "creative" },
    ],
    installCount: 0,
    activeOrgs: 0,
    rating: 0,
    scan: "block",
    versions: [{ v: "v1.0.0", desc: "首版提交", date: "2026-04-05", cur: true }],
    desc: "自动生成业务数据报表，支持多种图表类型与导出格式。",
    scene: "数据报表",
    techShape: "脚本型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    rejectReason: "存在数据安全风险，请完善权限校验机制后再提交",
  },
];

const STORE_AGENTS: Agent[] = AGENTS.filter(agent => agent.status === "online");
const DEFAULT_COMPANY_NAME = "星澜服饰集团";
const DEFAULT_CONTACT_NAME = "杨万泉";
const DEFAULT_CONTACT_PHONE = "13800008883";

const INITIAL_AGENT_ORDERS: AgentOrderRecord[] = [
  {
    id: "agent-order-001",
    agentId: 3,
    orderNo: "SO-20260419-001",
    orderType: "purchase",
    status: "reviewing",
    paymentMethod: "bankTransfer",
    companyName: DEFAULT_COMPANY_NAME,
    contactName: DEFAULT_CONTACT_NAME,
    contactPhone: DEFAULT_CONTACT_PHONE,
    createdAt: "2026-04-19 09:20",
    priceLabel: "¥12,800 / 年",
    remark: "交付团队需要先在项目部试运行。",
    receiptStatus: "submitted",
    receiptFileName: "project-delivery-bank-slip.pdf",
    receiptSubmittedAt: "2026-04-19 09:26",
    reviewNote: "已下单并上传转账凭证，等待平台运营审核。",
  },
  {
    id: "agent-order-002",
    agentId: 4,
    orderNo: "SO-20260418-004",
    orderType: "purchase",
    status: "awaitingReceipt",
    paymentMethod: "bankTransfer",
    companyName: DEFAULT_COMPANY_NAME,
    contactName: DEFAULT_CONTACT_NAME,
    contactPhone: DEFAULT_CONTACT_PHONE,
    createdAt: "2026-04-18 15:40",
    priceLabel: "线下签约",
    remark: "CRM 集成项目按企业专属范围开通。",
    receiptStatus: "notSubmitted",
    reviewNote: "订单已创建，请先上传付款凭证并提交审核。",
  },
  {
    id: "agent-order-003",
    agentId: 5,
    orderNo: "SO-20260417-007",
    orderType: "purchase",
    status: "awaitingActivation",
    paymentMethod: "bankTransfer",
    companyName: DEFAULT_COMPANY_NAME,
    contactName: DEFAULT_CONTACT_NAME,
    contactPhone: DEFAULT_CONTACT_PHONE,
    createdAt: "2026-04-17 18:10",
    priceLabel: "¥9,800 / 年",
    remark: "法务部先开通 10 个授权成员。",
    receiptStatus: "confirmed",
    receiptFileName: "contract-review-bank-slip.pdf",
    receiptSubmittedAt: "2026-04-18 10:05",
    reviewNote: "平台运营审核已通过，等待开通交付。",
  },
  {
    id: "agent-order-004",
    agentId: 12,
    orderNo: "SO-20260416-012",
    orderType: "trial",
    status: "active",
    companyName: DEFAULT_COMPANY_NAME,
    contactName: DEFAULT_CONTACT_NAME,
    contactPhone: DEFAULT_CONTACT_PHONE,
    createdAt: "2026-04-16 11:30",
    priceLabel: "0元试用",
    receiptStatus: "notRequired",
    expiresAt: "2026-04-23 23:59",
    reviewNote: "试用已开通，可在工作台直接使用。",
  },
];

const TRANSFER_ACCOUNT_INFO = {
  accountName: "上海前线智能科技有限公司",
  accountNo: "3105 1288 0001 9823",
  bankName: "招商银行上海徐汇支行",
  remittanceRemark: "请备注订单号后四位",
};

const AGENT_AVATAR_SEEDS: string[] = [
  "employee-pm",
  "employee-designer",
  "employee-research",
  "employee-ops",
  "employee-sales",
  "employee-product-manager",
  "employee-architect",
  "employee-growth",
  "employee-qa",
  "employee-data",
  "employee-user-researcher",
  "employee-writer",
];

const DOMAIN_TONE_MAP: Record<string, string> = {
  sales: "linear-gradient(180deg, #dff4ff 0%, #ebf8ff 58%, #f5fbff 100%)",
  delivery: "linear-gradient(180deg, #e4f6ff 0%, #edf9ff 58%, #f6fbff 100%)",
  procurement: "linear-gradient(180deg, #e9f8ff 0%, #f1faff 58%, #f7fbff 100%)",
  management: "linear-gradient(180deg, #e8f8ff 0%, #f0fbff 58%, #f7fcff 100%)",
  service: "linear-gradient(180deg, #e5f7ff 0%, #eefaff 58%, #f7fcff 100%)",
};

const CURRENT_EMPLOYEE_SOURCE = "张三";
const AGENT_FRAMEWORK_NAME = "Syngent";
const CURRENT_EMPLOYEE_NAME = "张三";

const SHELF_FILTER_OPTIONS: Array<{ label: string; value: AgentShelfFilter }> = [
  { label: "全部", value: "all" },
  { label: "企业专属", value: "exclusive" },
  { label: "企业共享", value: "shared" },
  { label: "我的", value: "mine" },
];

const DETAIL_TAB_OPTIONS: Array<{ key: AgentDetailTabKey; label: string }> = [
  { key: "basic", label: "基础信息" },
  { key: "skills", label: "关联Skill" },
  { key: "versions", label: "版本信息" },
  { key: "operations", label: "运营数据" },
];

const BUSINESS_LINE_OPTIONS: Array<{ label: string; value: BusinessLineFilter }> = [
  { label: "全部业务领域", value: "all" },
  { label: "通用", value: "general" },
  { label: "生产", value: "production" },
  { label: "销售", value: "sales" },
  { label: "供应链", value: "supplyChain" },
];

const DOMAIN_BUSINESS_LINE_MAP: Record<string, Exclude<BusinessLineFilter, "all">> = {
  sales: "sales",
  delivery: "production",
  procurement: "supplyChain",
  management: "general",
  service: "general",
};

const BUSINESS_LINE_LABEL_MAP: Record<Exclude<BusinessLineFilter, "all">, string> = {
  general: "通用",
  production: "生产",
  sales: "销售",
  supplyChain: "供应链",
};

interface AgentActionConfig {
  flowLabel: string;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryAction: AgentActionKind;
  secondaryAction?: AgentActionKind;
  tone: "primary" | "secondary" | "accent";
}

interface AgentOrderStatusMeta {
  label: string;
  tone: "success" | "warning" | "processing" | "danger";
}

interface AgentOrderStepItem {
  key: "request" | "review" | "activation";
  label: string;
  done: boolean;
  current: boolean;
}

const getAgentMarketScope = (agent: Agent): NonNullable<Agent["marketScope"]> =>
  agent.marketScope ?? (agent.type === "enterprise" ? "tenant" : "public");

const getVisibilityLabel = (agent: Agent): string => {
  const scope = getAgentMarketScope(agent);

  if (scope === "tenant") {
    return "企业可见";
  }

  if (scope === "team") {
    return "企业共享";
  }

  if (scope === "personal") {
    return "我的";
  }

  return "全平台";
};

const getDetailScopeLabel = (agent: Agent): string => {
  const scope = getAgentMarketScope(agent);

  if (scope === "tenant") {
    return agent.visibilityTargetName ?? "指定企业";
  }

  if (scope === "team") {
    return "企业共享";
  }

  if (scope === "personal") {
    return "仅自己可见";
  }

  return "公开";
};

const getDeliveryModeLabel = (agent: Agent): string => {
  const scope = getAgentMarketScope(agent);

  if (scope === "team") {
    return "直接添加";
  }

  if (scope === "personal") {
    return "个人使用";
  }

  return "购买开通";
};

const getAssetTypeLabel = (agent: Agent): string => {
  const scope = getAgentMarketScope(agent);

  if (scope === "tenant") {
    return "企业定制";
  }

  if (scope === "team") {
    return "企业共享";
  }

  if (scope === "personal") {
    return "个人开发";
  }

  return "公开商品";
};

const getCardContextLabel = (agent: Agent): string => {
  const scope = getAgentMarketScope(agent);

  if (scope === "team") {
    return "企业共享";
  }

  if (scope === "personal") {
    return "我的开发";
  }

  return agent.priceLabel ?? agent.visibilityTargetName ?? "内部共享";
};

const getOrderStatusMeta = (order: AgentOrderRecord): AgentOrderStatusMeta => {
  const statusMetaMap: Record<AgentOrderStatus, AgentOrderStatusMeta> = {
    awaitingReceipt: { label: "待上传凭证", tone: "warning" },
    reviewing: { label: "待审核", tone: "processing" },
    awaitingActivation: { label: "待开通", tone: "processing" },
    active: {
      label: order.orderType === "trial" ? "试用中" : "已开通",
      tone: "success",
    },
    rejected: { label: "已驳回", tone: "danger" },
  };

  return statusMetaMap[order.status];
};

const getPaymentMethodLabel = (paymentMethod?: AgentPaymentMethod): string => {
  if (paymentMethod === "bankTransfer") {
    return "对公转账";
  }

  return "-";
};

const getOrderTypeLabel = (orderType: AgentOrderType): string =>
  orderType === "trial" ? "免费试用" : "正式购买";

const getReceiptStatusLabel = (receiptStatus: AgentReceiptStatus): string => {
  const labelMap: Record<AgentReceiptStatus, string> = {
    notRequired: "无需凭证",
    notSubmitted: "未上传",
    submitted: "已上传",
    confirmed: "已确认",
  };

  return labelMap[receiptStatus];
};

const getOrderNextStepLabel = (order: AgentOrderRecord): string => {
  if (order.status === "awaitingReceipt") {
    return "请先上传付款凭证并提交审核";
  }

  if (order.status === "reviewing") {
    return "等待平台运营审核订单与付款凭证";
  }

  if (order.status === "awaitingActivation") {
    return "等待平台开通交付";
  }

  if (order.status === "active") {
    return order.orderType === "trial" ? "试用到期前可发起正式购买" : "当前已正式开通";
  }

  return "根据驳回原因重新提交订单";
};

const getOrderStepItems = (order: AgentOrderRecord): AgentOrderStepItem[] => {
  const reviewDone = order.status === "awaitingActivation" || order.status === "active";

  return [
    {
      key: "request",
      label: "下单",
      done: true,
      current: false,
    },
    {
      key: "review",
      label: "运营审核",
      done: reviewDone,
      current: order.status === "reviewing" || order.status === "awaitingReceipt",
    },
    {
      key: "activation",
      label: "开通交付",
      done: order.status === "active",
      current: order.status === "awaitingActivation",
    },
  ];
};

const buildOrderTimestamp = (orderCount: number): string => {
  const minute = `${10 + orderCount}`.padStart(2, "0");
  return `2026-04-19 14:${minute}`;
};

const buildOrderNo = (orderCount: number): string =>
  `SO-20260419-${`${orderCount + 1}`.padStart(3, "0")}`;

const createOrderRequestDraft = (
  agent: Agent,
  orderType: AgentOrderType,
): AgentOrderRequestDraft => ({
  agentId: agent.id,
  companyName: DEFAULT_COMPANY_NAME,
  contactName: DEFAULT_CONTACT_NAME,
  contactPhone: DEFAULT_CONTACT_PHONE,
  orderType,
  paymentMethod: "bankTransfer",
  remark: orderType === "trial" ? "申请试用后由运营审核开通。" : "",
});

const buildApplicationTimestamp = (): string => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");
  const hours = `${currentDate.getHours()}`.padStart(2, "0");
  const minutes = `${currentDate.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const getCardActionConfig = (
  agent: Agent,
  viewerRole: "employee" | "admin",
  order?: AgentOrderRecord,
): AgentActionConfig => {
  const scope = getAgentMarketScope(agent);

  if (scope === "team") {
    return {
      flowLabel: "企业共享",
      primaryLabel: "立即添加",
      primaryAction: "addWorkspace",
      tone: "accent",
    };
  }

  if (scope === "personal") {
    return {
      flowLabel: "我的开发",
      primaryLabel: "进入开发",
      primaryAction: "enterDev",
      tone: "secondary",
    };
  }

  if (viewerRole === "admin" && order) {
    if (order.status === "rejected") {
      return {
        flowLabel: getOrderTypeLabel(order.orderType),
        primaryLabel: "重新购买",
        secondaryLabel: agent.trialLabel ? "免费试用" : undefined,
        primaryAction: "requestPurchase",
        secondaryAction: agent.trialLabel ? "requestTrial" : undefined,
        tone: "primary",
      };
    }

    if (order.status === "active" && order.orderType === "trial") {
      return {
        flowLabel: getOrderTypeLabel(order.orderType),
        primaryLabel: "查看订单",
        secondaryLabel: "立即购买",
        primaryAction: "viewOrder",
        secondaryAction: "requestPurchase",
        tone: "primary",
      };
    }

    if (order.status === "awaitingReceipt") {
      return {
        flowLabel: getOrderTypeLabel(order.orderType),
        primaryLabel: "上传凭证",
        primaryAction: "viewOrder",
        tone: "primary",
      };
    }

    return {
      flowLabel: getOrderTypeLabel(order.orderType),
      primaryLabel: "查看订单",
      primaryAction: "viewOrder",
      tone: order.status === "active" ? "secondary" : "primary",
    };
  }

  if (viewerRole === "admin") {
    return {
      flowLabel: "企业采购",
      primaryLabel: "立即购买",
      secondaryLabel: agent.trialLabel ? "免费试用" : undefined,
      primaryAction: "requestPurchase",
      secondaryAction: agent.trialLabel ? "requestTrial" : undefined,
      tone: "primary",
    };
  }

  if (agent.trialLabel) {
    return {
      flowLabel: "免费试用",
      primaryLabel: "免费试用",
      secondaryLabel: "申请购买",
      primaryAction: "employeeTrial",
      secondaryAction: "employeeApplyPurchase",
      tone: "accent",
    };
  }

  return {
    flowLabel: "企业采购",
    primaryLabel: "申请开通",
    primaryAction: "employeeApplyAccess",
    tone: "secondary",
  };
};

const getRoleActionLabel = (
  agent: Agent,
  viewerRole: "employee" | "admin",
  order?: AgentOrderRecord,
): string => {
  if (viewerRole === "admin" && order) {
    return `${getOrderTypeLabel(order.orderType)} · ${getOrderStatusMeta(order).label}`;
  }

  if (agent.trialLabel) {
    return viewerRole === "admin" ? "立即购买 / 免费试用" : "免费试用 / 申请购买";
  }

  return getCardActionConfig(agent, viewerRole, order).primaryLabel;
};

const getBusinessLineValue = (domain: string): Exclude<BusinessLineFilter, "all"> =>
  DOMAIN_BUSINESS_LINE_MAP[domain] ?? "general";

const getBusinessLineLabel = (domain: string): string =>
  BUSINESS_LINE_LABEL_MAP[getBusinessLineValue(domain)];

const isSelfDevelopedAgent = (agent: Agent): boolean =>
  agent.source === CURRENT_EMPLOYEE_SOURCE || getAgentMarketScope(agent) === "personal";

const getCommodityApplicationStatusLabel = (
  application: OperationsAgentSubmission | null,
): string => {
  if (!application) {
    return "未申请";
  }

  if (application.status === "approved") {
    return "审核通过";
  }

  if (application.status === "rejected") {
    return "已驳回";
  }

  return "待审核";
};

const getAgentAvatarSeed = (agentId: number): string =>
  AGENT_AVATAR_SEEDS[(agentId - 1) % AGENT_AVATAR_SEEDS.length];

const getSubmitterLabel = (source: string): string => source.replace(/^FDE-/, "");

const getSubmitDateLabel = (submitTime: string): string => submitTime.split(" ")[0] ?? submitTime;

const getScanLabel = (scan: Agent["scan"]): string => {
  const labelMap: Record<Agent["scan"], string> = {
    pass: "已通过",
    warn: "待关注",
    block: "已阻断",
  };

  return labelMap[scan];
};

const getScanSummary = (scan: Agent["scan"]): string => {
  const summaryMap: Record<Agent["scan"], string> = {
    pass: "当前版本已完成平台扫描，可直接进入企业交付。",
    warn: "存在中等风险提醒，建议补充人工复核后继续推广。",
    block: "当前版本存在阻断项，需要整改完成后重新上架。",
  };

  return summaryMap[scan];
};

const getSkillTypeName = (type: string): string => {
  const map: Record<string, string> = {
    knowledge: "知识型",
    creative: "创作型",
    script: "脚本型",
    trigger: "触发型",
    linked: "联动型",
    workflow: "工作流型",
  };

  return map[type] ?? type;
};

/**
 * Agent 广场商店视图，展示已上架 Agent 的筛选与浏览入口。
 */
export const FdeAgentStoreView = ({
  onNavigateToAgentDev,
  viewerRole = "employee",
}: FdeAgentStoreViewProps): JSX.Element => {
  const isAdminView = viewerRole === "admin";
  const [shelfFilter, setShelfFilter] = useState<AgentShelfFilter>("all");
  const [businessLineFilter, setBusinessLineFilter] = useState<BusinessLineFilter>("all");
  const [detailTab, setDetailTab] = useState<AgentDetailTabKey>("basic");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [orderRecords, setOrderRecords] = useState<AgentOrderRecord[]>(() => {
    const storedOrders = loadEnterpriseAgentOrders();
    return storedOrders.length ? storedOrders : INITIAL_AGENT_ORDERS;
  });
  const [orderRequestDraft, setOrderRequestDraft] = useState<AgentOrderRequestDraft | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [detailReceiptFiles, setDetailReceiptFiles] = useState<UploadFile[]>([]);
  const [commodityApplications, setCommodityApplications] = useState<
    OperationsAgentSubmission[]
  >(() => loadEnterpriseCommodityApplications());
  const [commodityApplicationDraft, setCommodityApplicationDraft] =
    useState<CommodityApplicationDraft | null>(null);

  useEffect(() => {
    saveEnterpriseAgentOrders(orderRecords);
  }, [orderRecords]);

  useEffect(() => {
    saveEnterpriseCommodityApplications(commodityApplications);
  }, [commodityApplications]);

  const filteredAgents = useMemo(
    () =>
      STORE_AGENTS.filter(agent => {
        if (shelfFilter === "exclusive" && getAgentMarketScope(agent) !== "tenant") {
          return false;
        }

        if (shelfFilter === "shared" && getAgentMarketScope(agent) !== "team") {
          return false;
        }

        if (
          shelfFilter === "mine" &&
          agent.source !== CURRENT_EMPLOYEE_SOURCE &&
          getAgentMarketScope(agent) !== "personal"
        ) {
          return false;
        }

        if (
          businessLineFilter !== "all" &&
          getBusinessLineValue(agent.domain) !== businessLineFilter
        ) {
          return false;
        }

        return true;
      }),
    [businessLineFilter, shelfFilter],
  );

  const latestOrderByAgentId = useMemo<Record<number, AgentOrderRecord>>(
    () =>
      orderRecords.reduce<Record<number, AgentOrderRecord>>((result, order) => {
        if (!result[order.agentId]) {
          result[order.agentId] = order;
        }

        return result;
      }, {}),
    [orderRecords],
  );

  const selectedAgentOrder = useMemo(
    () => (selectedAgent ? latestOrderByAgentId[selectedAgent.id] : undefined),
    [latestOrderByAgentId, selectedAgent],
  );
  const selectedAgentCommodityApplication = useMemo(
    () =>
      selectedAgent
        ? commodityApplications.find(
            item => item.id === `commodity-application-${selectedAgent.id}`,
          ) ?? null
        : null,
    [commodityApplications, selectedAgent],
  );

  const activeOrder = useMemo(
    () => orderRecords.find(order => order.id === activeOrderId) ?? null,
    [activeOrderId, orderRecords],
  );

  const activeOrderAgent = useMemo(
    () => (activeOrder ? STORE_AGENTS.find(agent => agent.id === activeOrder.agentId) ?? null : null),
    [activeOrder],
  );

  const handleOpenDetail = useCallback((agent: Agent): void => {
    setSelectedAgent(agent);
    setDetailTab("basic");
  }, []);

  const handleCloseDetail = useCallback((): void => {
    setSelectedAgent(null);
    setDetailTab("basic");
  }, []);

  const handleCloseOrderModal = useCallback((): void => {
    setActiveOrderId(null);
    setDetailReceiptFiles([]);
  }, []);

  const handleOpenCommodityApplication = useCallback((agent: Agent): void => {
    const currentApplication =
      commodityApplications.find(item => item.id === `commodity-application-${agent.id}`) ??
      null;

    setCommodityApplicationDraft({
      proposedProductName:
        currentApplication?.proposedProductName ?? `${agent.name} 标准版`,
      reason: currentApplication?.submitReason ?? "",
    });
  }, [commodityApplications]);

  const handleCloseCommodityApplication = useCallback((): void => {
    setCommodityApplicationDraft(null);
  }, []);

  const handleOpenOrderRequest = useCallback((agent: Agent, orderType: AgentOrderType): void => {
    setOrderRequestDraft(createOrderRequestDraft(agent, orderType));
  }, []);

  const handleCloseOrderRequest = useCallback((): void => {
    setOrderRequestDraft(null);
  }, []);

  const handlePrimaryAction = useCallback(
    (agent: Agent, actionKind: AgentActionKind, order?: AgentOrderRecord): void => {
      if (actionKind === "addWorkspace") {
        message.success(`已将「${agent.name}」添加到我的工作台。`);
        return;
      }

      if (actionKind === "enterDev") {
        if (onNavigateToAgentDev) {
          onNavigateToAgentDev();
          return;
        }

        message.info("请前往开发与进化继续完善后再分享。");
        return;
      }

      if (actionKind === "requestPurchase") {
        handleOpenOrderRequest(agent, "purchase");
        return;
      }

      if (actionKind === "requestTrial") {
        handleOpenOrderRequest(agent, "trial");
        return;
      }

      if (actionKind === "viewOrder" || actionKind === "continuePayment") {
        if (order) {
          setActiveOrderId(order.id);
        }
        return;
      }

      if (actionKind === "employeeTrial") {
        message.success(
          `已将试用版「${agent.name}」添加到工作台。试用到期后将自动失效，如需继续使用请购买开通。`,
        );
        return;
      }

      if (actionKind === "employeeApplyPurchase") {
        message.success(`已提交「${agent.name}」购买需求。`);
        return;
      }

      message.success(`已提交「${agent.name}」开通申请。`);
    },
    [handleOpenOrderRequest, onNavigateToAgentDev],
  );

  const handleSecondaryAction = useCallback(
    (agent: Agent, actionKind: AgentActionKind | undefined, order?: AgentOrderRecord): void => {
      if (!actionKind) {
        return;
      }

      handlePrimaryAction(agent, actionKind, order);
    },
    [handlePrimaryAction],
  );

  const handleSubmitOrderRequest = useCallback((): void => {
    if (!orderRequestDraft) {
      return;
    }

    const targetAgent = STORE_AGENTS.find(agent => agent.id === orderRequestDraft.agentId);

    if (!targetAgent) {
      return;
    }

    const nextOrder: AgentOrderRecord = {
      id: `agent-order-${Date.now()}`,
      agentId: targetAgent.id,
      orderNo: buildOrderNo(orderRecords.length),
      orderType: orderRequestDraft.orderType,
      status: orderRequestDraft.orderType === "trial" ? "reviewing" : "awaitingReceipt",
      paymentMethod:
        orderRequestDraft.orderType === "purchase" ? orderRequestDraft.paymentMethod : undefined,
      companyName: orderRequestDraft.companyName.trim() || DEFAULT_COMPANY_NAME,
      contactName: orderRequestDraft.contactName.trim() || DEFAULT_CONTACT_NAME,
      contactPhone: orderRequestDraft.contactPhone.trim() || DEFAULT_CONTACT_PHONE,
      createdAt: buildOrderTimestamp(orderRecords.length),
      priceLabel:
        orderRequestDraft.orderType === "trial"
          ? targetAgent.trialLabel ?? "0元试用"
          : targetAgent.priceLabel ?? "线下签约",
      remark: orderRequestDraft.remark.trim(),
      receiptStatus: orderRequestDraft.orderType === "trial" ? "notRequired" : "notSubmitted",
      receiptFileName: undefined,
      receiptSubmittedAt: undefined,
      reviewNote:
        orderRequestDraft.orderType === "trial"
          ? "已提交试用申请，等待平台运营审核。"
          : "订单已创建，请先上传付款凭证并提交审核。",
    };

    setOrderRecords(currentOrders => [nextOrder, ...currentOrders]);
    setOrderRequestDraft(null);
    setActiveOrderId(nextOrder.id);
    message.success(
      orderRequestDraft.orderType === "trial"
        ? `已提交「${targetAgent.name}」试用申请。`
        : `已创建「${targetAgent.name}」订单，请继续上传付款凭证。`,
    );
  }, [orderRecords.length, orderRequestDraft]);

  const handleUpdateOrderRequestField = useCallback(
    (field: keyof AgentOrderRequestDraft, value: string): void => {
      setOrderRequestDraft(currentDraft => {
        if (!currentDraft) {
          return currentDraft;
        }

        return {
          ...currentDraft,
          [field]: value,
        };
      });
    },
    [],
  );

  const handleSubmitReceipt = useCallback((): void => {
    if (!activeOrder || !detailReceiptFiles.length) {
      return;
    }

    const receiptSubmittedAt = buildOrderTimestamp(orderRecords.length + 1);

    setOrderRecords(currentOrders =>
      currentOrders.map(order =>
        order.id === activeOrder.id
          ? {
              ...order,
              status: "reviewing",
              receiptStatus: "submitted",
              receiptFileName: detailReceiptFiles[0]?.name,
              receiptSubmittedAt,
              reviewNote: "已上传付款凭证并提交审核，等待平台运营审核。",
            }
          : order,
      ),
    );
    setDetailReceiptFiles([]);
    message.success("付款凭证已上传并提交审核。");
  }, [activeOrder, detailReceiptFiles, orderRecords.length]);

  const handleUpdateCommodityApplicationField = useCallback(
    (field: keyof CommodityApplicationDraft, value: string): void => {
      setCommodityApplicationDraft(currentDraft => {
        if (!currentDraft) {
          return currentDraft;
        }

        return {
          ...currentDraft,
          [field]: value,
        };
      });
    },
    [],
  );

  const handleSubmitCommodityApplication = useCallback((): void => {
    if (!selectedAgent || !commodityApplicationDraft) {
      return;
    }

    const submitReason = commodityApplicationDraft.reason.trim();
    const proposedProductName = commodityApplicationDraft.proposedProductName.trim();

    if (!proposedProductName) {
      message.warning("请填写拟上架商品名");
      return;
    }

    if (!submitReason) {
      message.warning("请填写申请理由");
      return;
    }

    const nextApplication: OperationsAgentSubmission = {
      id: `commodity-application-${selectedAgent.id}`,
      name: selectedAgent.name,
      version: selectedAgent.version,
      submitter: `${CURRENT_EMPLOYEE_NAME} - 当前企业租户`,
      submittedAt: buildApplicationTimestamp(),
      status: "pending",
      submissionType: "commodityApplication",
      proposedProductName,
      submitReason,
      currentScopeLabel: "已发布到企业 AI专家广场",
      description:
        "当前 AI专家已发布到企业 AI专家广场，仅支持企业内部使用，需经运营审核后才可转换为对外可售商品。",
    };

    setCommodityApplications(currentApplications => {
      const nextApplications = currentApplications.filter(
        item => item.id !== nextApplication.id,
      );

      return [nextApplication, ...nextApplications];
    });
    setCommodityApplicationDraft(null);
    message.success("商品化申请已提交，等待平台运营审核。");
  }, [commodityApplicationDraft, selectedAgent]);

  const detailContent = useMemo((): JSX.Element | null => {
    if (!selectedAgent) {
      return null;
    }

    if (detailTab === "skills") {
      return (
        <div className={styles.detailPaneBody}>
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>关联Skill</h3>
            <div className={styles.detailBlockDivider} />
            <div className={styles.detailSkillGrid}>
              {selectedAgent.skills.map(skill => (
                <article
                  key={`${selectedAgent.id}-${skill.name}`}
                  className={styles.detailSkillCard}
                >
                  <span className={styles.detailSkillTypeTag}>{getSkillTypeName(skill.type)}</span>
                  <h4 className={styles.detailSkillCardTitle}>{skill.name}</h4>
                  <p className={styles.detailSkillCardText}>
                    用于{selectedAgent.scene ?? "当前业务场景"}中的能力编排，支撑
                    {selectedAgent.name}在实际交付中的执行效果。
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (detailTab === "versions") {
      return (
        <div className={styles.detailPaneBody}>
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>版本信息</h3>
            <div className={styles.detailBlockDivider} />
            {selectedAgent.pendingVersion ? (
              <div className={styles.detailHighlightCard}>
                <div className={styles.detailHighlightHead}>
                  <strong>待发布版本</strong>
                  <span>{selectedAgent.pendingVersion.v}</span>
                </div>
                <p>{selectedAgent.pendingVersion.desc}</p>
                <div className={styles.detailHighlightMeta}>
                  <span>提交时间：{selectedAgent.pendingVersion.date}</span>
                  <span>提交人：{getSubmitterLabel(selectedAgent.pendingVersion.source ?? selectedAgent.source)}</span>
                </div>
              </div>
            ) : null}
            <div className={styles.versionList}>
              {selectedAgent.versions.map(version => (
                <div key={`${selectedAgent.id}-${version.v}`} className={styles.versionItem}>
                  <div>
                    <strong>{version.v}</strong>
                    <p>{version.desc}</p>
                  </div>
                  <div className={styles.versionMeta}>
                    {version.cur ? (
                      <span className={styles.detailMetaChip}>当前版本</span>
                    ) : null}
                    <span>{version.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (detailTab === "operations") {
      return (
        <div className={styles.detailPaneBody}>
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>运营数据</h3>
            <div className={styles.detailBlockDivider} />
            <div className={styles.detailOperationGrid}>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>当前状态</span>
                <strong className={styles.detailMetricValue}>已上架</strong>
              </div>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>服务企业</span>
                <strong className={styles.detailMetricValue}>{selectedAgent.activeOrgs} 家</strong>
              </div>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>授权拉取</span>
                <strong className={styles.detailMetricValue}>{selectedAgent.installCount} 次</strong>
              </div>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>评分</span>
                <strong className={styles.detailMetricValue}>
                  {selectedAgent.rating > 0 ? `${selectedAgent.rating} / 5.0` : "-"}
                </strong>
              </div>
            </div>
            <div className={styles.detailInsightCard}>
              <div className={styles.detailInsightHead}>
                <strong>平台扫描</strong>
                <span className={styles.detailMetaChip}>{getScanLabel(selectedAgent.scan)}</span>
              </div>
              <p>{getScanSummary(selectedAgent.scan)}</p>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className={styles.detailPaneBody}>
        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>基础信息</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailProfileCard}>
            <img
              alt={selectedAgent.name}
              className={styles.detailAvatar}
              src={getAvatarUrl(getAgentAvatarSeed(selectedAgent.id))}
            />
            <div className={styles.detailProfileMain}>
              <div className={styles.detailProfileTitleRow}>
                <h4 className={styles.detailProfileTitle}>{selectedAgent.name}</h4>
                <span className={styles.detailStatusBadge}>已上架</span>
              </div>
              <div className={styles.detailProfileMetaRow}>
                <span>
                  提交人：<strong>{getSubmitterLabel(selectedAgent.source)}</strong>
                </span>
                <span>
                  提交时间：<strong>{getSubmitDateLabel(selectedAgent.submitTime)}</strong>
                </span>
                <span className={styles.detailScopeRow}>
                  可见范围：
                  <span className={styles.detailMetaChip}>
                    {getDetailScopeLabel(selectedAgent)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.detailIntroSection}>
            <h4 className={styles.detailSubTitle}>简介</h4>
            <div className={styles.detailIntroCard}>
              <p>{selectedAgent.desc}</p>
            </div>
          </div>
        </section>

        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>获取与交付</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailProcurementCard}>
            <div className={styles.detailProcurementHead}>
              <div>
                <strong>{getAssetTypeLabel(selectedAgent)}</strong>
              </div>
              {selectedAgent.priceLabel ? (
                <span className={styles.detailPriceBadge}>{selectedAgent.priceLabel}</span>
              ) : null}
            </div>
            <div className={styles.detailKeyValueGrid}>
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>
                  {selectedAgentOrder ? "当前订单" : "支持获取"}
                </span>
                <strong className={styles.detailKeyValueValue}>
                  {selectedAgentOrder
                    ? selectedAgentOrder.orderNo
                    : selectedAgent.trialLabel
                    ? "免费试用 / 正式购买"
                    : "正式购买"}
                </strong>
              </div>
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>
                  {selectedAgentOrder ? "订单状态" : "当前角色动作"}
                </span>
                <strong className={styles.detailKeyValueValue}>
                  {selectedAgentOrder
                    ? getOrderStatusMeta(selectedAgentOrder).label
                    : getRoleActionLabel(selectedAgent, viewerRole, selectedAgentOrder)}
                </strong>
              </div>
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>
                  {selectedAgentOrder ? "获取类型" : "价格 / 试用"}
                </span>
                <strong className={styles.detailKeyValueValue}>
                  {selectedAgentOrder
                    ? getOrderTypeLabel(selectedAgentOrder.orderType)
                    : `${selectedAgent.priceLabel ?? "内部共享"}${
                        selectedAgent.trialLabel ? ` · ${selectedAgent.trialLabel}` : ""
                      }`}
                </strong>
              </div>
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>
                  {selectedAgentOrder ? "支付方式" : "支付方式"}
                </span>
                <strong className={styles.detailKeyValueValue}>
                  {selectedAgentOrder
                    ? getPaymentMethodLabel(selectedAgentOrder.paymentMethod)
                    : getAgentMarketScope(selectedAgent) === "team" ||
                        getAgentMarketScope(selectedAgent) === "personal"
                      ? "无需支付"
                      : "对公转账"}
                </strong>
              </div>
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>
                  {selectedAgentOrder ? "凭证状态" : "开通方式"}
                </span>
                <strong className={styles.detailKeyValueValue}>
                  {selectedAgentOrder
                    ? getReceiptStatusLabel(selectedAgentOrder.receiptStatus)
                    : selectedAgent.trialLabel
                      ? "审核通过后开通试用"
                      : getAgentMarketScope(selectedAgent) === "team" ||
                          getAgentMarketScope(selectedAgent) === "personal"
                        ? "添加后立即可用"
                        : "上传凭证并审核通过后开通"}
                </strong>
              </div>
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>
                  {selectedAgentOrder ? "下一步" : "当前状态"}
                </span>
                <strong className={styles.detailKeyValueValue}>
                  {selectedAgentOrder
                    ? getOrderNextStepLabel(selectedAgentOrder)
                    : "可申请"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {isSelfDevelopedAgent(selectedAgent) ? (
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>商品化申请</h3>
            <div className={styles.detailBlockDivider} />
            <div className={styles.detailProcurementCard}>
              <div className={styles.detailKeyValueGrid}>
                <div className={styles.detailKeyValueItem}>
                  <span className={styles.detailKeyValueLabel}>当前发布范围</span>
                  <strong className={styles.detailKeyValueValue}>企业内使用</strong>
                </div>
                <div className={styles.detailKeyValueItem}>
                  <span className={styles.detailKeyValueLabel}>商品化状态</span>
                  <strong className={styles.detailKeyValueValue}>
                    {getCommodityApplicationStatusLabel(
                      selectedAgentCommodityApplication,
                    )}
                  </strong>
                </div>
                <div className={styles.detailKeyValueItem}>
                  <span className={styles.detailKeyValueLabel}>拟上架商品名</span>
                  <strong className={styles.detailKeyValueValue}>
                    {selectedAgentCommodityApplication?.proposedProductName ?? "-"}
                  </strong>
                </div>
                <div className={styles.detailKeyValueItem}>
                  <span className={styles.detailKeyValueLabel}>申请说明</span>
                  <strong className={styles.detailKeyValueValue}>
                    {selectedAgentCommodityApplication
                      ? "平台运营审核通过后进入商品中心"
                      : "可提交商品化申请"}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>业务信息</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailKeyValueGrid}>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>业务领域</span>
              <strong className={styles.detailKeyValueValue}>
                {getBusinessLineLabel(selectedAgent.domain)}
              </strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>业务场景</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.scene ?? "-"}</strong>
            </div>
          </div>
        </section>

        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>技术配置</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailKeyValueGrid}>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>AGENT 框架</span>
              <strong className={styles.detailKeyValueValue}>{AGENT_FRAMEWORK_NAME}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>技术形态</span>
              <strong className={styles.detailKeyValueValue}>
                {selectedAgent.techShape ?? selectedAgent.typeName ?? "-"}
              </strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>绑定模型</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.model ?? "-"}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>RUNTIME 类型</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.runtime ?? "-"}</strong>
            </div>
          </div>
        </section>
      </div>
    );
  }, [
    detailTab,
    selectedAgent,
    selectedAgentCommodityApplication,
    selectedAgentOrder,
    viewerRole,
  ]);

  const selectedAgentAction = useMemo<AgentActionConfig | null>(
    () =>
      selectedAgent
        ? getCardActionConfig(selectedAgent, viewerRole, selectedAgentOrder)
        : null,
    [selectedAgent, selectedAgentOrder, viewerRole],
  );
  const selectedAgentCommodityButtonLabel = useMemo((): string => {
    if (!selectedAgentCommodityApplication) {
      return "申请上架为商品";
    }

    if (selectedAgentCommodityApplication.status === "rejected") {
      return "重新申请上架为商品";
    }

    return "查看商品申请";
  }, [selectedAgentCommodityApplication]);
  const requestTargetAgent = useMemo(
    () =>
      orderRequestDraft
        ? STORE_AGENTS.find(agent => agent.id === orderRequestDraft.agentId) ?? null
        : null,
    [orderRequestDraft],
  );
  const activeOrderStatusMeta = useMemo(
    () => (activeOrder ? getOrderStatusMeta(activeOrder) : null),
    [activeOrder],
  );
  const detailUploadProps: UploadProps = useMemo(
    () => ({
      beforeUpload: () => false,
      fileList: detailReceiptFiles,
      maxCount: 1,
      onChange: info => {
        setDetailReceiptFiles(info.fileList.slice(-1));
      },
      onRemove: () => {
        setDetailReceiptFiles([]);
      },
    }),
    [detailReceiptFiles],
  );

  return (
    <div className={styles.root}>
      <div className={styles.toolbarCard}>
        <div className={styles.filterGroup}>
          <Select
            className={styles.filterSelect}
            options={SHELF_FILTER_OPTIONS}
            popupMatchSelectWidth={false}
            value={shelfFilter}
            onChange={value => setShelfFilter(value)}
          />
          <Select
            className={styles.filterSelect}
            options={BUSINESS_LINE_OPTIONS}
            popupMatchSelectWidth={false}
            value={businessLineFilter}
            onChange={value => setBusinessLineFilter(value)}
          />
        </div>

        <Button className={styles.createButton} type="primary" onClick={onNavigateToAgentDev}>
          <PlusOutlined />
          创建Agent
        </Button>
      </div>

      <div className={styles.agentGrid}>
        {filteredAgents.map(agent => {
          const currentOrder = latestOrderByAgentId[agent.id];
          const actionConfig = getCardActionConfig(agent, viewerRole, currentOrder);
          const orderStatusMeta = currentOrder ? getOrderStatusMeta(currentOrder) : null;

          return (
            <article key={agent.id} className={styles.agentCard}>
              <button
                type="button"
                className={styles.cardPreviewButton}
                onClick={() => handleOpenDetail(agent)}
              >
                <div
                  className={styles.visualPanel}
                  style={{ background: DOMAIN_TONE_MAP[agent.domain] ?? DOMAIN_TONE_MAP.management }}
                >
                  <span className={styles.visibilityBadge}>{getVisibilityLabel(agent)}</span>
                  <div className={styles.visualGlow} />
                  <img
                    alt={agent.name}
                    className={styles.agentPortrait}
                    src={getAvatarUrl(
                      AGENT_AVATAR_SEEDS[(agent.id - 1) % AGENT_AVATAR_SEEDS.length],
                    )}
                  />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{agent.name}</h3>
                    <div className={styles.cardVersionMeta}>
                      <span className={styles.publishBadge}>已上架</span>
                      {orderStatusMeta && isAdminView ? (
                        <span
                          className={`${styles.orderStatusBadge} ${
                            orderStatusMeta.tone === "success"
                              ? styles.orderStatusBadgeSuccess
                              : orderStatusMeta.tone === "warning"
                                ? styles.orderStatusBadgeWarning
                                : orderStatusMeta.tone === "danger"
                                  ? styles.orderStatusBadgeDanger
                                  : styles.orderStatusBadgeProcessing
                          }`}
                        >
                          {orderStatusMeta.label}
                        </span>
                      ) : null}
                      <span className={styles.versionText}>{agent.version}</span>
                    </div>
                  </div>

                  <div className={styles.badgeRow}>
                    <span className={`${styles.miniBadge} ${styles.domainBadge}`}>
                      {getBusinessLineLabel(agent.domain)}
                    </span>
                    <span className={`${styles.miniBadge} ${styles.scopeBadge}`}>
                      {getAssetTypeLabel(agent)}
                    </span>
                  </div>

                  <p className={styles.agentDescription}>{agent.desc}</p>
                  <div className={styles.cardDeliveryInfo}>
                    <strong>
                      {currentOrder && isAdminView ? currentOrder.orderNo : getCardContextLabel(agent)}
                    </strong>
                    <span>
                      {currentOrder && isAdminView
                        ? getOrderNextStepLabel(currentOrder)
                        : agent.trialLabel ?? getDeliveryModeLabel(agent)}
                    </span>
                  </div>
                </div>
              </button>

              <div className={styles.cardFooter}>
                <Button
                  className={
                    actionConfig.tone === "primary"
                      ? `${styles.cardActionButton} ${styles.cardActionButtonPrimary}`
                      : actionConfig.tone === "accent"
                      ? `${styles.cardActionButton} ${styles.cardActionButtonAccent}`
                      : styles.cardActionButton
                  }
                  type={actionConfig.tone === "primary" ? "primary" : "default"}
                  onClick={() => handlePrimaryAction(agent, actionConfig.primaryAction, currentOrder)}
                >
                  {actionConfig.primaryLabel}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {!filteredAgents.length ? (
        <div className={styles.emptyState}>当前筛选条件下暂无已上架 Agent。</div>
      ) : null}

      <Modal
        className={styles.detailModal}
        wrapClassName={styles.detailModalWrap}
        destroyOnClose
        footer={null}
        open={Boolean(selectedAgent)}
        onCancel={handleCloseDetail}
        title={
          <span className={styles.detailModalTitle}>
            {selectedAgent ? selectedAgent.name : "Agent 详情"}
          </span>
        }
        width={680}
      >
        {selectedAgent ? (
          <div className={styles.detailShell}>
            <div className={styles.detailTabBar} role="tablist" aria-label="Agent 详情页签">
              {DETAIL_TAB_OPTIONS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={
                    item.key === detailTab
                      ? `${styles.detailTabButton} ${styles.detailTabButtonActive}`
                      : styles.detailTabButton
                  }
                  onClick={() => setDetailTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.detailScrollArea}>{detailContent}</div>
            <div className={styles.detailActionBar}>
              <div className={styles.detailActionButtons}>
                {selectedAgent && isSelfDevelopedAgent(selectedAgent) ? (
                  <Button
                    className={styles.detailSecondaryButton}
                    onClick={() => handleOpenCommodityApplication(selectedAgent)}
                  >
                    {selectedAgentCommodityButtonLabel}
                  </Button>
                ) : null}
                {selectedAgentAction?.secondaryLabel ? (
                  <Button
                    className={styles.detailSecondaryButton}
                    onClick={() =>
                      handleSecondaryAction(
                        selectedAgent,
                        selectedAgentAction.secondaryAction,
                        selectedAgentOrder,
                      )
                    }
                  >
                    {selectedAgentAction.secondaryLabel}
                  </Button>
                ) : null}
                {selectedAgentAction ? (
                  <Button
                    className={
                      selectedAgentAction.tone === "primary"
                        ? `${styles.detailPrimaryButton} ${styles.detailPrimaryButtonDark}`
                        : selectedAgentAction.tone === "accent"
                        ? `${styles.detailPrimaryButton} ${styles.detailPrimaryButtonAccent}`
                        : styles.detailPrimaryButton
                    }
                    type={selectedAgentAction.tone === "primary" ? "primary" : "default"}
                    onClick={() =>
                      handlePrimaryAction(
                        selectedAgent,
                        selectedAgentAction.primaryAction,
                        selectedAgentOrder,
                      )
                    }
                  >
                    {selectedAgentAction.primaryLabel}
                  </Button>
                ) : null}
                <Button className={styles.detailCloseButton} type="primary" onClick={handleCloseDetail}>
                  关闭
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.orderRequestModal}
        destroyOnClose
        footer={null}
        open={Boolean(selectedAgent && commodityApplicationDraft)}
        onCancel={handleCloseCommodityApplication}
        title={<span className={styles.detailModalTitle}>申请上架为商品</span>}
        width={560}
      >
        {selectedAgent && commodityApplicationDraft ? (
          <div className={styles.orderRequestBody}>
            <div className={styles.orderRequestSummary}>
              <div>
                <strong>{selectedAgent.name}</strong>
                <span>当前仅在 AI专家广场企业内使用</span>
              </div>
              <span className={styles.detailMetaChip}>
                {getCommodityApplicationStatusLabel(selectedAgentCommodityApplication)}
              </span>
            </div>

            <div className={styles.orderFormGrid}>
              <div className={styles.orderFormItem}>
                <span className={styles.orderFormLabel}>拟上架商品名</span>
                <Input
                  value={commodityApplicationDraft.proposedProductName}
                  onChange={event =>
                    handleUpdateCommodityApplicationField(
                      "proposedProductName",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className={styles.orderFormItemFull}>
                <span className={styles.orderFormLabel}>申请理由</span>
                <Input.TextArea
                  rows={4}
                  value={commodityApplicationDraft.reason}
                  placeholder="请输入申请上架为商品的理由"
                  onChange={event =>
                    handleUpdateCommodityApplicationField("reason", event.target.value)
                  }
                />
              </div>
            </div>

            <div className={styles.orderRequestFooter}>
              <Button onClick={handleCloseCommodityApplication}>取消</Button>
              <Button type="primary" onClick={handleSubmitCommodityApplication}>
                提交申请
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.orderRequestModal}
        destroyOnClose
        footer={null}
        open={Boolean(orderRequestDraft && requestTargetAgent)}
        onCancel={handleCloseOrderRequest}
        title={
          <span className={styles.detailModalTitle}>
            {orderRequestDraft?.orderType === "trial" ? "提交试用申请" : "下单购买"}
          </span>
        }
        width={560}
      >
        {orderRequestDraft && requestTargetAgent ? (
          <div className={styles.orderRequestBody}>
            <div className={styles.orderRequestSummary}>
              <div>
                <strong>{requestTargetAgent.name}</strong>
                <span>{requestTargetAgent.priceLabel ?? "线下签约"}</span>
              </div>
              <span className={styles.detailMetaChip}>
                {orderRequestDraft.orderType === "trial" ? "免费试用" : "正式购买"}
              </span>
            </div>

            <div className={styles.orderFormGrid}>
              <div className={styles.orderFormItem}>
                <span className={styles.orderFormLabel}>企业名称</span>
                <Input
                  value={orderRequestDraft.companyName}
                  onChange={event =>
                    handleUpdateOrderRequestField("companyName", event.target.value)
                  }
                />
              </div>
              <div className={styles.orderFormItem}>
                <span className={styles.orderFormLabel}>联系人</span>
                <Input
                  value={orderRequestDraft.contactName}
                  onChange={event =>
                    handleUpdateOrderRequestField("contactName", event.target.value)
                  }
                />
              </div>
              <div className={styles.orderFormItem}>
                <span className={styles.orderFormLabel}>联系电话</span>
                <Input
                  value={orderRequestDraft.contactPhone}
                  onChange={event =>
                    handleUpdateOrderRequestField("contactPhone", event.target.value)
                  }
                />
              </div>
              {orderRequestDraft.orderType === "purchase" ? (
              <div className={styles.orderFormItem}>
                <span className={styles.orderFormLabel}>支付方式</span>
                <Input value="对公转账" disabled />
              </div>
              ) : null}
              <div className={`${styles.orderFormItem} ${styles.orderFormItemFull}`}>
                <span className={styles.orderFormLabel}>订单备注</span>
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  value={orderRequestDraft.remark}
                  placeholder="补充采购背景、使用范围或开通要求"
                  onChange={event => handleUpdateOrderRequestField("remark", event.target.value)}
                />
              </div>
            </div>

            <div className={styles.orderRequestFooter}>
              <Button onClick={handleCloseOrderRequest}>取消</Button>
              <Button type="primary" onClick={handleSubmitOrderRequest}>
                {orderRequestDraft.orderType === "trial" ? "提交试用申请" : "提交订单"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.orderDetailModal}
        destroyOnClose
        footer={null}
        open={Boolean(activeOrder && activeOrderAgent)}
        onCancel={handleCloseOrderModal}
        title={<span className={styles.detailModalTitle}>{activeOrder?.orderNo ?? "订单详情"}</span>}
        width={620}
      >
        {activeOrder && activeOrderAgent && activeOrderStatusMeta ? (
          <div className={styles.orderDetailBody}>
            <div className={styles.orderDetailHeader}>
              <div>
                <strong>{activeOrderAgent.name}</strong>
                <span>{getOrderTypeLabel(activeOrder.orderType)}</span>
              </div>
              <span
                className={`${styles.orderStatusBadge} ${
                  activeOrderStatusMeta.tone === "success"
                    ? styles.orderStatusBadgeSuccess
                    : activeOrderStatusMeta.tone === "warning"
                      ? styles.orderStatusBadgeWarning
                      : activeOrderStatusMeta.tone === "danger"
                        ? styles.orderStatusBadgeDanger
                        : styles.orderStatusBadgeProcessing
                }`}
              >
                {activeOrderStatusMeta.label}
              </span>
            </div>

            <div className={styles.orderStepList}>
              {getOrderStepItems(activeOrder).map(step => (
                <div
                  key={step.key}
                  className={`${styles.orderStepItem} ${
                    step.done
                      ? styles.orderStepItemDone
                      : step.current
                        ? styles.orderStepItemCurrent
                        : ""
                  }`}
                >
                  <span className={styles.orderStepDot} />
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>

            <div className={styles.orderDetailGrid}>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>企业名称</span>
                <strong>{activeOrder.companyName}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>联系人</span>
                <strong>
                  {activeOrder.contactName} · {activeOrder.contactPhone}
                </strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>提交时间</span>
                <strong>{activeOrder.createdAt}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>支付方式</span>
                <strong>{getPaymentMethodLabel(activeOrder.paymentMethod)}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>订单金额</span>
                <strong>{activeOrder.priceLabel}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>凭证状态</span>
                <strong>{getReceiptStatusLabel(activeOrder.receiptStatus)}</strong>
              </div>
              {activeOrder.expiresAt ? (
                <div className={styles.orderDetailItem}>
                  <span className={styles.orderDetailLabel}>到期时间</span>
                  <strong>{activeOrder.expiresAt}</strong>
                </div>
              ) : null}
              <div className={`${styles.orderDetailItem} ${styles.orderDetailItemFull}`}>
                <span className={styles.orderDetailLabel}>当前进度</span>
                <strong>{getOrderNextStepLabel(activeOrder)}</strong>
              </div>
              {activeOrder.reviewNote ? (
                <div className={`${styles.orderDetailItem} ${styles.orderDetailItemFull}`}>
                  <span className={styles.orderDetailLabel}>处理说明</span>
                  <strong>{activeOrder.reviewNote}</strong>
                </div>
              ) : null}
            </div>

            {activeOrder.paymentMethod === "bankTransfer" ? (
              <div className={styles.orderTransferCard}>
                <div className={styles.orderTransferHead}>
                  <strong>收款信息</strong>
                  <span>下单后上传付款凭证，提交平台审核</span>
                </div>
                <div className={styles.orderTransferGrid}>
                  <div className={styles.orderTransferItem}>
                    <span>收款户名</span>
                    <strong>{TRANSFER_ACCOUNT_INFO.accountName}</strong>
                  </div>
                  <div className={styles.orderTransferItem}>
                    <span>收款账号</span>
                    <strong>{TRANSFER_ACCOUNT_INFO.accountNo}</strong>
                  </div>
                  <div className={styles.orderTransferItem}>
                    <span>开户行</span>
                    <strong>{TRANSFER_ACCOUNT_INFO.bankName}</strong>
                  </div>
                  <div className={styles.orderTransferItem}>
                    <span>凭证状态</span>
                    <strong>
                      {activeOrder.receiptFileName
                        ? `${activeOrder.receiptFileName}${
                            activeOrder.receiptSubmittedAt ? ` · ${activeOrder.receiptSubmittedAt}` : ""
                          }`
                        : "暂未上传"}
                    </strong>
                  </div>
                </div>

                <div className={styles.orderTransferActionRow}>
                  <div className={styles.orderUploadPanel}>
                    <Upload
                      {...detailUploadProps}
                      disabled={activeOrder.status !== "awaitingReceipt"}
                    >
                      <Button disabled={activeOrder.status !== "awaitingReceipt"}>
                        {activeOrder.status === "awaitingReceipt" ? "选择凭证文件" : "当前不可重新上传"}
                      </Button>
                    </Upload>
                    <Button
                      type="primary"
                      disabled={activeOrder.status !== "awaitingReceipt" || !detailReceiptFiles.length}
                      onClick={handleSubmitReceipt}
                    >
                      上传凭证并提交审核
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.orderRequestFooter}>
              {activeOrder.status === "active" && activeOrder.orderType === "trial" ? (
                <Button
                  type="primary"
                  onClick={() => {
                    handleCloseOrderModal();
                    handleOpenOrderRequest(activeOrderAgent, "purchase");
                  }}
                >
                  立即购买
                </Button>
              ) : null}
              <Button onClick={handleCloseOrderModal}>关闭</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
