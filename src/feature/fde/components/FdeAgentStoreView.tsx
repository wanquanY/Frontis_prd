import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Select, message } from "antd";
import dayjs from "dayjs";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";
import { FDE_AGENT_STORE_ITEMS } from "@/feature/fde/mockData";
import {
  loadEnterpriseAgentOrders,
  saveEnterpriseAgentOrders,
  type EnterpriseAgentOrderRecord,
} from "@/feature/fde/enterpriseAgentOrders";
import {
  buildMockPaymentOrderId,
  buildMockPaymentQr,
  formatMockPaymentCountdown,
  MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
} from "@/feature/commerce/mockPayment";
import {
  loadStoredOperationsFulfillments,
  loadStoredOperationsProducts,
  saveStoredOperationsFulfillments,
} from "@/feature/operations/commerceStorage";
import { loadStoredAgentPlazaCategories } from "@/feature/operations/agentPlazaCategoryStorage";
import { OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY } from "@/feature/operations/mockData";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentSubmission,
  OperationsFulfillment,
  OperationsProduct,
  OperationsProductDeliveryKind,
  OperationsProductSubscriptionPlan,
  OperationsProductSubscriptionPlanKey,
} from "@/feature/operations/types";
import { getAvatarUrl } from "@/pages/utils";

import styles from "./FdeAgentStoreView.module.less";

interface FdeAgentStoreViewProps {
  onNavigateToAgentDev?: () => void;
  viewerRole?: "employee" | "admin";
}

type AgentShelfFilter = "all" | "mine" | "teamShare" | "frontis";
type BusinessLineFilter = "all" | BusinessLineKey;
type BusinessLineKey = OperationsAgentPlazaCategoryOption["name"];
type AgentSourceType = "mine" | "teamShare" | "frontis";
type AgentActionKind = "addWorkspace" | "openFree" | "openTrial" | "openPurchase" | "viewOrder";
type AgentAcquisitionMode = "free" | "trial" | "purchase";
type AcquisitionStep = "summary" | "pay" | "success";
type BadgeTone = "success" | "warning" | "danger" | "processing";

interface AgentCapability {
  name: string;
  typeLabel: string;
  description: string;
}

interface AgentVersionItem {
  label: string;
  description: string;
  date: string;
  current?: boolean;
}

interface TeamSharedAgentTemplate {
  id: string;
  name: string;
  versionLabel: string;
  businessLine: BusinessLineKey;
  businessLineLabel: string;
  summary: string;
  scene: string;
  techShape: string;
  model: string;
  runtime: string;
  submitterLabel: string;
  sharedByLabel: string;
  updatedAt: string;
  capabilities: AgentCapability[];
  versions: AgentVersionItem[];
}

interface PlatformAgentBlueprint {
  businessLine: BusinessLineKey;
  businessLineLabel: string;
  summary: string;
  scene: string;
  techShape: string;
  model: string;
  runtime: string;
  capabilities: AgentCapability[];
}

interface StoreAgentItem {
  id: string;
  sourceType: AgentSourceType;
  visualSeed: string;
  name: string;
  versionLabel: string;
  businessLine: BusinessLineKey;
  businessLineLabel: string;
  summary: string;
  scene: string;
  techShape: string;
  model: string;
  runtime: string;
  submitterLabel: string;
  scopeLabel: string;
  updatedAt: string;
  capabilities: AgentCapability[];
  versions: AgentVersionItem[];
  priceLabel?: string;
  trialLabel?: string;
  acquisitionLabel: string;
  deliveryLabel: string;
  product?: OperationsProduct;
  order?: EnterpriseAgentOrderRecord | null;
  fulfillment?: OperationsFulfillment | null;
  commodityApplication?: OperationsAgentSubmission | null;
}

interface AgentActionConfig {
  primaryLabel: string;
  primaryAction: AgentActionKind;
  tone: "default" | "accent" | "primary";
  secondaryLabel?: string;
  secondaryAction?: AgentActionKind;
}

interface CommodityApplicationDraft {
  agentId: string;
  proposedProductName: string;
  reason: string;
}

interface AcquisitionState {
  open: boolean;
  agentId?: string;
  mode: AgentAcquisitionMode;
  selectedPlanKey?: OperationsProductSubscriptionPlanKey;
  step: AcquisitionStep;
  orderNo: string;
  countdownSeconds: number;
  isProcessingPayment: boolean;
  completedOrderId?: string;
}

interface OrderStatusMeta {
  label: string;
  tone: BadgeTone;
}

interface OrderStepItem {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
}

const DEFAULT_TENANT_ID = "tenant-enterprise-demo";
const DEFAULT_TENANT_NAME = "星澜服饰租户";
const DEFAULT_VIEWER_ROLE: "employee" | "admin" = "employee";
const ACTIVE_FULFILLMENT_STATUSES = new Set<OperationsFulfillment["status"]>([
  "active",
  "completed",
]);

const SHELF_FILTER_OPTIONS: Array<{ label: string; value: AgentShelfFilter }> = [
  { label: "全部", value: "all" },
  { label: "我的", value: "mine" },
  { label: "团队分享", value: "teamShare" },
  { label: "FrontisAI发布", value: "frontis" },
];

const DEFAULT_DOMAIN_TONE = "linear-gradient(180deg, #dff4ff 0%, #eef8ff 100%)";

const DOMAIN_TONE_MAP: Record<string, string> = {
  通用: DEFAULT_DOMAIN_TONE,
  销售: "linear-gradient(180deg, #fff1d7 0%, #fff8eb 100%)",
  生产: "linear-gradient(180deg, #e3f7ef 0%, #f4fcf8 100%)",
  供应链: "linear-gradient(180deg, #ede9fe 0%, #f5f3ff 100%)",
  办公协同: "linear-gradient(180deg, #e6f0ff 0%, #f5f8ff 100%)",
};

const TEAM_SHARED_AGENTS: TeamSharedAgentTemplate[] = [
  {
    id: "team-shared-sales-script",
    name: "销售话术助手",
    versionLabel: "v1.2.0",
    businessLine: "销售",
    businessLineLabel: "销售",
    summary: "根据客户画像与历史沟通记录，生成个性化销售话术与应对策略。",
    scene: "销售沟通",
    techShape: "对话型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    submitterLabel: "王晨 · 销售团队",
    sharedByLabel: "销售团队",
    updatedAt: "2026-04-15",
    capabilities: [
      {
        name: "客户意图识别",
        typeLabel: "分析能力",
        description: "识别客户当前关注点与成交阻力。",
      },
      {
        name: "话术生成",
        typeLabel: "生成能力",
        description: "根据场景自动生成沟通脚本和回复建议。",
      },
      {
        name: "历史对话召回",
        typeLabel: "知识能力",
        description: "对照历史沟通记录输出更稳定的跟进话术。",
      },
    ],
    versions: [
      {
        label: "v1.2.0",
        description: "新增行业话术模板与异议处理建议。",
        date: "2026-04-15",
        current: true,
      },
      {
        label: "v1.1.0",
        description: "优化客户意图识别准确率。",
        date: "2026-04-08",
      },
    ],
  },
  {
    id: "team-shared-opportunity",
    name: "商机跟进提醒",
    versionLabel: "v1.0.5",
    businessLine: "销售",
    businessLineLabel: "销售",
    summary: "自动追踪销售漏斗各阶段商机，根据停留时长推送跟进提醒。",
    scene: "商机管理",
    techShape: "触发型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    submitterLabel: "李婷 · 客户成功部",
    sharedByLabel: "客户成功部",
    updatedAt: "2026-04-10",
    capabilities: [
      {
        name: "商机时效监控",
        typeLabel: "触发能力",
        description: "监控商机阶段停留时长并生成提醒。",
      },
      {
        name: "跟进动作建议",
        typeLabel: "生成能力",
        description: "根据商机状态输出下一步跟进建议。",
      },
    ],
    versions: [
      {
        label: "v1.0.5",
        description: "修复提醒延迟并补充动作建议模板。",
        date: "2026-04-10",
        current: true,
      },
      {
        label: "v1.0.0",
        description: "首版上线。",
        date: "2026-04-01",
      },
    ],
  },
  {
    id: "team-shared-delivery",
    name: "项目交付助手",
    versionLabel: "v2.0.0",
    businessLine: "生产",
    businessLineLabel: "生产",
    summary: "智能追踪项目里程碑与交付进度，自动生成周报与风险提醒。",
    scene: "项目管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    submitterLabel: "陈雪梅 · 交付中心",
    sharedByLabel: "交付中心",
    updatedAt: "2026-04-12",
    capabilities: [
      {
        name: "进度分析",
        typeLabel: "分析能力",
        description: "识别延期风险并追踪关键里程碑。",
      },
      {
        name: "周报生成",
        typeLabel: "生成能力",
        description: "自动汇总项目状态并输出周报。",
      },
      {
        name: "风险预警",
        typeLabel: "告警能力",
        description: "对交付异常、阻塞项和资源冲突做提醒。",
      },
    ],
    versions: [
      {
        label: "v2.0.0",
        description: "新增里程碑风险预警与周报模板。",
        date: "2026-04-12",
        current: true,
      },
      {
        label: "v1.5.0",
        description: "优化任务同步与周报格式。",
        date: "2026-04-05",
      },
    ],
  },
  {
    id: "team-shared-contract",
    name: "合同审查助手",
    versionLabel: "v1.1.0",
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    summary: "面向标准合同场景，快速识别关键风险条款并给出审查建议。",
    scene: "法务审查",
    techShape: "文档型",
    model: "GPT-4.1",
    runtime: "标准Runtime",
    submitterLabel: "赵立 · 法务支持组",
    sharedByLabel: "法务支持组",
    updatedAt: "2026-04-18",
    capabilities: [
      {
        name: "条款识别",
        typeLabel: "分析能力",
        description: "识别付款、违约、责任边界等关键条款。",
      },
      {
        name: "审查建议",
        typeLabel: "生成能力",
        description: "输出修改建议与风险提示。",
      },
    ],
    versions: [
      {
        label: "v1.1.0",
        description: "新增销售合同与采购合同模板。",
        date: "2026-04-18",
        current: true,
      },
      {
        label: "v1.0.0",
        description: "首版上线。",
        date: "2026-04-06",
      },
    ],
  },
];

const FRONTIS_AGENT_BLUEPRINTS: Record<string, PlatformAgentBlueprint> = {
  商品运营素材助手: {
    businessLine: "销售",
    businessLineLabel: "销售",
    summary: "生成商品卖点、详情页文案和推广素材建议，适合电商运营内容生产。",
    scene: "商品运营",
    techShape: "创作型",
    model: "GPT-4.1",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "商品卖点拆解",
        typeLabel: "分析能力",
        description: "从产品信息中提取核心卖点与场景价值。",
      },
      {
        name: "营销素材生成",
        typeLabel: "生成能力",
        description: "输出主图文案、详情页和活动推广素材建议。",
      },
      {
        name: "投放建议",
        typeLabel: "策略能力",
        description: "根据活动目标生成投放切入点和内容节奏。",
      },
    ],
  },
  客户对账核验助手: {
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    summary: "针对客户账单与交易记录做自动核验，辅助识别差异与风险项。",
    scene: "财务对账",
    techShape: "核验型",
    model: "Claude Sonnet 4.6",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "账单差异识别",
        typeLabel: "分析能力",
        description: "自动比对账单和流水，识别差异项。",
      },
      {
        name: "核验结论生成",
        typeLabel: "生成能力",
        description: "输出对账异常清单和核验建议。",
      },
      {
        name: "记录追溯",
        typeLabel: "追踪能力",
        description: "保留核验过程中的关键证据和异常记录。",
      },
    ],
  },
  制度问答助手: {
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    summary: "面向企业制度与知识问答场景，可直接基于平台知识库进行检索回答。",
    scene: "制度问答",
    techShape: "问答型",
    model: "Kimi 企业版",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "制度检索",
        typeLabel: "知识能力",
        description: "检索制度、流程和常见规范文档。",
      },
      {
        name: "标准问答",
        typeLabel: "问答能力",
        description: "基于制度内容输出清晰回答。",
      },
    ],
  },
};

const createDefaultAcquisitionState = (): AcquisitionState => ({
  open: false,
  mode: "purchase",
  selectedPlanKey: undefined,
  step: "summary",
  orderNo: "",
  countdownSeconds: MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
  isProcessingPayment: false,
});

const getBusinessLineLabel = (line: BusinessLineKey): string =>
  line.trim() || OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;

const getDomainTone = (line: BusinessLineKey): string =>
  DOMAIN_TONE_MAP[line] ?? DEFAULT_DOMAIN_TONE;

const getBusinessLineOptions = (
  categories: OperationsAgentPlazaCategoryOption[],
): Array<{ label: string; value: BusinessLineFilter }> => [
  { label: "全部业务", value: "all" },
  ...[...categories]
    .filter(item => item.status === "active")
    .sort((leftItem, rightItem) => {
      if (leftItem.sortOrder !== rightItem.sortOrder) {
        return leftItem.sortOrder - rightItem.sortOrder;
      }

      return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
    })
    .map(item => ({
      label: item.name,
      value: item.name,
    })),
];

const getActiveSubscriptionPlans = (
  product: OperationsProduct,
): OperationsProductSubscriptionPlan[] =>
  (product.subscriptionPlans ?? [])
    .filter(item => item.status === "active")
    .sort((leftItem, rightItem) => leftItem.sortOrder - rightItem.sortOrder);

const getSelectedSubscriptionPlan = (
  product: OperationsProduct,
  selectedPlanKey?: OperationsProductSubscriptionPlanKey,
): OperationsProductSubscriptionPlan | null => {
  const activePlans = getActiveSubscriptionPlans(product);

  if (!activePlans.length) {
    return null;
  }

  if (!selectedPlanKey) {
    return activePlans[0] ?? null;
  }

  return activePlans.find(item => item.key === selectedPlanKey) ?? activePlans[0] ?? null;
};

const getSubscriptionPlanValidityLabel = (plan: OperationsProductSubscriptionPlan): string =>
  `${plan.durationLabel}内无限次使用`;

const getSubscriptionPlanAveragePriceLabel = (
  plan: OperationsProductSubscriptionPlan,
): string | null => {
  if (plan.key === "month") {
    return null;
  }

  const monthCount = plan.key === "quarter" ? 3 : 12;
  const averagePrice = plan.price / monthCount;

  return `月均${averagePrice.toFixed(2)}元`;
};

const getTenantPurchaseName = (tenantName: string): string =>
  tenantName.replace(/租户$/, "").trim() || tenantName;

const getProductPriceLabel = (
  product: OperationsProduct,
  selectedPlanKey?: OperationsProductSubscriptionPlanKey,
): string => {
  if (product.saleType === "free") {
    return "免费领取";
  }

  const selectedPlan = getSelectedSubscriptionPlan(product, selectedPlanKey);

  if (selectedPlan) {
    const activePlanCount = getActiveSubscriptionPlans(product).length;
    const suffix =
      activePlanCount > 1 && !selectedPlanKey
        ? ` / ${selectedPlan.title}起`
        : ` / ${selectedPlan.title}`;

    return `¥${selectedPlan.price.toLocaleString("zh-CN")}${suffix}`;
  }

  if (product.billingSpec === "year") {
    return `¥${(product.price ?? 0).toLocaleString("zh-CN")} / 年`;
  }

  if (product.billingSpec === "month") {
    return `¥${(product.price ?? 0).toLocaleString("zh-CN")} / 月`;
  }

  if ((product.price ?? 0) <= 0) {
    return "待配置价格";
  }

  return `¥${(product.price ?? 0).toLocaleString("zh-CN")}`;
};

const getProductTrialLabel = (product: OperationsProduct): string | undefined => {
  if (!product.supportsTrial || !product.trialUnit || !product.trialValue) {
    return undefined;
  }

  return product.trialUnit === "day"
    ? `${product.trialValue}天试用`
    : `${product.trialValue}次试用`;
};

const getDeliveryLabel = (deliveryKind: OperationsProductDeliveryKind): string => {
  if (deliveryKind === "softwareService") {
    return "支付后立即可用";
  }

  if (deliveryKind === "thirdPartyApi") {
    return "第三方接口开通";
  }

  if (deliveryKind === "virtualDevice") {
    return "云端工作站开通";
  }

  return "设备交付";
};

const getVisibilityLabel = (agent: StoreAgentItem): string => {
  if (agent.sourceType === "mine") {
    return "我的";
  }

  if (agent.sourceType === "teamShare") {
    return "团队分享";
  }

  return "FrontisAI发布";
};

const getAcquisitionLabel = (product: OperationsProduct): string => {
  if (product.saleType === "free") {
    return "免费领取";
  }

  return product.supportsTrial ? "可试用 / 订阅" : "付费订阅";
};

const getCommodityApplicationStatusLabel = (
  application: OperationsAgentSubmission | null | undefined,
): string => {
  if (!application) {
    return "未申请";
  }

  if (application.status === "pending") {
    return "审核中";
  }

  if (application.status === "approved") {
    return "已进入商品化流程";
  }

  return "已驳回";
};

const getOrderStatusMeta = (order: EnterpriseAgentOrderRecord): OrderStatusMeta => {
  if (order.orderType === "purchase" && order.status === "active") {
    return {
      label: "已订阅",
      tone: "success",
    };
  }

  if (order.orderType === "trial" && order.status === "trialing") {
    return {
      label: "试用中",
      tone: "processing",
    };
  }

  return {
    label: "试用已过期",
    tone: "danger",
  };
};

const getOrderStatusClassName = (tone: BadgeTone): string => {
  if (tone === "success") {
    return styles.orderStatusBadgeSuccess;
  }

  if (tone === "warning") {
    return styles.orderStatusBadgeWarning;
  }

  if (tone === "danger") {
    return styles.orderStatusBadgeDanger;
  }

  return styles.orderStatusBadgeProcessing;
};

const getOrderTypeLabel = (orderType: EnterpriseAgentOrderRecord["orderType"]): string =>
  orderType === "trial" ? "免费试用" : "正式订阅";

const getSubscriptionPlanExpiresAt = (
  planKey: OperationsProductSubscriptionPlanKey,
  startTime: dayjs.Dayjs,
): string => {
  if (planKey === "month") {
    return startTime.add(30, "day").format("YYYY-MM-DD HH:mm");
  }

  if (planKey === "quarter") {
    return startTime.add(90, "day").format("YYYY-MM-DD HH:mm");
  }

  return startTime.add(365, "day").format("YYYY-MM-DD HH:mm");
};

const buildTeamSharedAgents = (
  applicationsByAgentId: Map<string, OperationsAgentSubmission>,
): StoreAgentItem[] =>
  TEAM_SHARED_AGENTS.map(item => ({
    id: item.id,
    sourceType: "teamShare",
    visualSeed: item.id,
    name: item.name,
    versionLabel: item.versionLabel,
    businessLine: item.businessLine,
    businessLineLabel: item.businessLineLabel,
    summary: item.summary,
    scene: item.scene,
    techShape: item.techShape,
    model: item.model,
    runtime: item.runtime,
    submitterLabel: item.submitterLabel,
    scopeLabel: item.submitterLabel.split("·")[0]?.trim() || item.submitterLabel,
    updatedAt: item.updatedAt,
    capabilities: item.capabilities,
    versions: item.versions,
    acquisitionLabel: "团队内直接使用",
    deliveryLabel: "添加到工作台后立即可用",
    commodityApplication: applicationsByAgentId.get(item.id) ?? null,
  }));

const mapFdeCategoryToBusinessLine = (
  category: (typeof FDE_AGENT_STORE_ITEMS)[number]["category"],
): BusinessLineKey => {
  if (category === "sales") {
    return "销售";
  }

  if (category === "production") {
    return "生产";
  }

  if (category === "supply") {
    return "供应链";
  }

  return OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;
};

const buildMyAgents = (
  currentUserName: string,
  applicationsByAgentId: Map<string, OperationsAgentSubmission>,
): StoreAgentItem[] =>
  FDE_AGENT_STORE_ITEMS.filter(item => item.id.startsWith("agent-mine-")).map(item => {
    const businessLine = mapFdeCategoryToBusinessLine(item.category);

    return {
      id: item.id,
      sourceType: "mine",
      visualSeed: item.id,
      name: item.name,
      versionLabel: item.version,
      businessLine,
      businessLineLabel: getBusinessLineLabel(businessLine),
      summary: item.description,
      scene: item.tags[0] ?? "通用场景",
      techShape:
        item.agentType === "metaagent"
          ? "编排型"
          : item.agentType === "openclaw"
            ? "执行型"
            : "对话型",
      model: item.skills[0]?.skillName ?? "自定义模型",
      runtime:
        item.agentType === "metaagent"
          ? "MetaAgent Runtime"
          : item.agentType === "openclaw"
            ? "OpenClaw Runtime"
            : "Syngent Runtime",
      submitterLabel: currentUserName,
      scopeLabel: "我开发的 AI专家",
      updatedAt: item.publishTime,
      capabilities: item.skills.map(skill => ({
        name: skill.skillName,
        typeLabel: "技能能力",
        description: `${skill.skillName} ${skill.version}`,
      })),
      versions: item.versions.map((versionItem, index) => ({
        label: versionItem.version,
        description: versionItem.releaseNote,
        date: versionItem.publishTime,
        current: index === 0,
      })),
      acquisitionLabel: "我开发的 AI专家",
      deliveryLabel: "添加到工作台后立即可用",
      commodityApplication: applicationsByAgentId.get(item.id) ?? null,
    };
  });

const isProductVisibleToTenant = (product: OperationsProduct, tenantId: string): boolean => {
  if (product.status !== "active" || product.supplyKind !== "agent") {
    return false;
  }

  if (product.plazaVisibility === "tenant") {
    return Boolean(product.visibleTenantIds?.includes(tenantId));
  }

  return true;
};

const buildPlatformAgentVersions = (
  product: OperationsProduct,
  updatedAt: string,
): AgentVersionItem[] => [
  {
    label: "当前版本",
    description: product.description,
    date: updatedAt,
    current: true,
  },
];

const buildFrontisAgents = (
  products: OperationsProduct[],
  tenantId: string,
  latestOrdersByProductId: Map<string, EnterpriseAgentOrderRecord>,
  latestFulfillmentsByProductId: Map<string, OperationsFulfillment>,
): StoreAgentItem[] =>
  products
    .filter(product => isProductVisibleToTenant(product, tenantId))
    .sort((leftItem, rightItem) => {
      const leftSort = leftItem.plazaSort ?? 999;
      const rightSort = rightItem.plazaSort ?? 999;

      if (leftSort !== rightSort) {
        return leftSort - rightSort;
      }

      return rightItem.updatedAt.localeCompare(leftItem.updatedAt);
    })
    .map(product => {
      const displayName = product.linkedAgentName?.trim() || product.name.trim();
      const blueprint = FRONTIS_AGENT_BLUEPRINTS[displayName];
      const businessLine =
        product.plazaCategory?.trim() ||
        blueprint?.businessLine ||
        OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;
      const businessLineLabel = getBusinessLineLabel(businessLine);
      const updatedAt = product.updatedAt || "刚刚";

      return {
        id: `frontis-${product.id}`,
        sourceType: "frontis",
        visualSeed: `frontis-${displayName}`,
        name: displayName,
        versionLabel: updatedAt,
        businessLine,
        businessLineLabel,
        summary: blueprint?.summary ?? product.description,
        scene: blueprint?.scene ?? "FrontisAI发布",
        techShape: blueprint?.techShape ?? "商品化服务",
        model: blueprint?.model ?? "平台托管模型",
        runtime: blueprint?.runtime ?? "Frontis 托管Runtime",
        submitterLabel: "FrontisAI发布",
        scopeLabel: "平台商品化能力",
        updatedAt,
        capabilities: blueprint?.capabilities ?? [
          {
            name: "标准开通",
            typeLabel: "交付能力",
            description: "支付后自动开通，立即可用。",
          },
        ],
        versions: buildPlatformAgentVersions(product, updatedAt),
        priceLabel: getProductPriceLabel(product),
        trialLabel: getProductTrialLabel(product),
        acquisitionLabel: getAcquisitionLabel(product),
        deliveryLabel: getDeliveryLabel(product.deliveryKind),
        product,
        order: latestOrdersByProductId.get(product.id) ?? null,
        fulfillment: latestFulfillmentsByProductId.get(product.id) ?? null,
      };
    });

const resolveLatestOrdersByProductId = (
  tenantId: string,
  orders: EnterpriseAgentOrderRecord[],
): Map<string, EnterpriseAgentOrderRecord> =>
  orders
    .filter(item => item.tenantId === tenantId)
    .sort(
      (leftItem, rightItem) =>
        dayjs(rightItem.createdAt).valueOf() - dayjs(leftItem.createdAt).valueOf(),
    )
    .reduce<Map<string, EnterpriseAgentOrderRecord>>((result, item) => {
      if (!result.has(item.productId)) {
        result.set(item.productId, item);
      }

      return result;
    }, new Map<string, EnterpriseAgentOrderRecord>());

const resolveLatestFulfillmentsByProductId = (
  tenantId: string,
  fulfillments: OperationsFulfillment[],
): Map<string, OperationsFulfillment> =>
  fulfillments
    .filter(item => item.tenantId === tenantId && ACTIVE_FULFILLMENT_STATUSES.has(item.status))
    .sort(
      (leftItem, rightItem) =>
        dayjs(rightItem.updatedAt).valueOf() - dayjs(leftItem.updatedAt).valueOf(),
    )
    .reduce<Map<string, OperationsFulfillment>>((result, item) => {
      if (!result.has(item.productId)) {
        result.set(item.productId, item);
      }

      return result;
    }, new Map<string, OperationsFulfillment>());

const getCardContextLabel = (agent: StoreAgentItem): string => {
  if (agent.sourceType === "mine") {
    return agent.commodityApplication?.proposedProductName ?? "我开发的 AI专家";
  }

  if (agent.sourceType === "teamShare") {
    return agent.scopeLabel;
  }

  if (agent.order?.orderNo) {
    return agent.order.orderNo;
  }

  if (agent.product?.saleType === "free") {
    return "可免费获取";
  }

  return agent.trialLabel ? "支持试用后订阅" : "订阅后立即可用";
};

const getCardContextMeta = (agent: StoreAgentItem): string => {
  if (agent.sourceType === "mine") {
    return agent.commodityApplication
      ? getCommodityApplicationStatusLabel(agent.commodityApplication)
      : "可申请商品化";
  }

  if (agent.sourceType === "teamShare") {
    return "添加后即可使用";
  }

  if (agent.order) {
    return getOrderStatusMeta(agent.order).label;
  }

  return agent.trialLabel ?? agent.deliveryLabel;
};

const getAgentActionConfig = (agent: StoreAgentItem): AgentActionConfig => {
  if (agent.sourceType === "mine" || agent.sourceType === "teamShare") {
    return {
      primaryLabel: "添加到工作台",
      primaryAction: "addWorkspace",
      tone: "accent",
    };
  }

  const hasAccess = Boolean(agent.fulfillment);

  if (hasAccess) {
    return {
      primaryLabel: "添加到工作台",
      primaryAction: "addWorkspace",
      tone: "primary",
      secondaryLabel: agent.order ? "查看订单" : undefined,
      secondaryAction: agent.order ? "viewOrder" : undefined,
    };
  }

  if (agent.product?.saleType === "free") {
    return {
      primaryLabel: "免费获取",
      primaryAction: "openFree",
      tone: "primary",
    };
  }

  if (agent.product?.supportsTrial) {
    return {
      primaryLabel: "立即订阅",
      primaryAction: "openPurchase",
      tone: "primary",
      secondaryLabel: "免费试用",
      secondaryAction: "openTrial",
    };
  }

  return {
    primaryLabel: "立即订阅",
    primaryAction: "openPurchase",
    tone: "primary",
  };
};

const getOrderStepItems = (order: EnterpriseAgentOrderRecord): OrderStepItem[] => {
  if (order.orderType === "purchase") {
    return [
      {
        key: "create",
        label: "生成订单",
        done: true,
        current: false,
      },
      {
        key: "pay",
        label: "扫码支付",
        done: Boolean(order.paidAt),
        current: false,
      },
      {
        key: "active",
        label: "开通完成",
        done: order.status === "active",
        current: order.status === "active",
      },
    ];
  }

  return [
    {
      key: "trial",
      label: "开通试用",
      done: true,
      current: false,
    },
    {
      key: "running",
      label: order.status === "expired" ? "试用已结束" : "试用中",
      done: true,
      current: order.status !== "expired",
    },
    {
      key: "convert",
      label: "可转正式订阅",
      done: order.status === "expired",
      current: order.status === "expired",
    },
  ];
};

/**
 * AI 专家广场原型页，承接团队分享与 FrontisAI发布商品化 AI 专家。
 */
export const FdeAgentStoreView = ({
  onNavigateToAgentDev,
  viewerRole,
}: FdeAgentStoreViewProps): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const [shelfFilter, setShelfFilter] = useState<AgentShelfFilter>("all");
  const [businessLineFilter, setBusinessLineFilter] = useState<BusinessLineFilter>("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [products, setProducts] = useState<OperationsProduct[]>(() =>
    loadStoredOperationsProducts(),
  );
  const [fulfillments, setFulfillments] = useState<OperationsFulfillment[]>(() =>
    loadStoredOperationsFulfillments(),
  );
  const [orders, setOrders] = useState<EnterpriseAgentOrderRecord[]>(() =>
    loadEnterpriseAgentOrders(),
  );
  const [commodityApplications, setCommodityApplications] = useState<OperationsAgentSubmission[]>(
    () => loadEnterpriseCommodityApplications(),
  );
  const [agentPlazaCategories, setAgentPlazaCategories] = useState<
    OperationsAgentPlazaCategoryOption[]
  >(() => loadStoredAgentPlazaCategories());
  const [commodityDraft, setCommodityDraft] = useState<CommodityApplicationDraft | null>(null);
  const [acquisitionState, setAcquisitionState] = useState<AcquisitionState>(
    createDefaultAcquisitionState(),
  );
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const currentTenantId = activeIdentity?.tenantId ?? DEFAULT_TENANT_ID;
  const currentTenantName = activeIdentity?.tenantName ?? DEFAULT_TENANT_NAME;
  const currentTenantPurchaseName = getTenantPurchaseName(currentTenantName);
  const currentUserName = activeIdentity?.subjectName ?? session?.name ?? "当前用户";
  const tenantSnapshot = useMemo(
    () => getMockTenantManagementSnapshot(currentTenantId),
    [currentTenantId],
  );
  const isTeamEdition = tenantSnapshot?.edition === "team";
  const hasAgentListingAccess = Boolean(tenantSnapshot?.hasAgentListingAccess);
  const effectiveViewerRole: "employee" | "admin" =
    viewerRole ?? (activeIdentity?.role === "admin" ? "admin" : DEFAULT_VIEWER_ROLE);
  const isAdminView = effectiveViewerRole === "admin";

  const shelfFilterOptions = useMemo(
    () =>
      isTeamEdition
        ? SHELF_FILTER_OPTIONS
        : SHELF_FILTER_OPTIONS.filter(item => item.value !== "teamShare"),
    [isTeamEdition],
  );

  const businessLineOptions = useMemo(
    () => getBusinessLineOptions(agentPlazaCategories),
    [agentPlazaCategories],
  );

  const refreshStorefrontState = useCallback((): void => {
    setProducts(loadStoredOperationsProducts());
    setFulfillments(loadStoredOperationsFulfillments());
    setOrders(loadEnterpriseAgentOrders());
    setCommodityApplications(loadEnterpriseCommodityApplications());
    setAgentPlazaCategories(loadStoredAgentPlazaCategories());
  }, []);

  useEffect(() => {
    refreshStorefrontState();
  }, [refreshStorefrontState]);

  useEffect(() => {
    if (!isTeamEdition && shelfFilter === "teamShare") {
      setShelfFilter("all");
    }
  }, [isTeamEdition, shelfFilter]);

  useEffect(() => {
    if (businessLineFilter === "all") {
      return;
    }

    const hasCurrentFilter = businessLineOptions.some(item => item.value === businessLineFilter);

    if (!hasCurrentFilter) {
      setBusinessLineFilter("all");
    }
  }, [businessLineFilter, businessLineOptions]);

  useEffect(() => {
    if (!acquisitionState.open || acquisitionState.step !== "pay") {
      return;
    }

    const timer = window.setInterval(() => {
      setAcquisitionState(currentState => {
        if (currentState.countdownSeconds <= 1) {
          window.clearInterval(timer);
          return {
            ...currentState,
            countdownSeconds: 0,
          };
        }

        return {
          ...currentState,
          countdownSeconds: currentState.countdownSeconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [acquisitionState.open, acquisitionState.step]);

  const commodityApplicationsByAgentId = useMemo(
    () =>
      commodityApplications.reduce<Map<string, OperationsAgentSubmission>>((result, item) => {
        result.set(item.id, item);
        return result;
      }, new Map<string, OperationsAgentSubmission>()),
    [commodityApplications],
  );

  const latestOrdersByProductId = useMemo(
    () => resolveLatestOrdersByProductId(currentTenantId, orders),
    [currentTenantId, orders],
  );

  const latestFulfillmentsByProductId = useMemo(
    () => resolveLatestFulfillmentsByProductId(currentTenantId, fulfillments),
    [currentTenantId, fulfillments],
  );

  const teamSharedAgents = useMemo(
    () => buildTeamSharedAgents(commodityApplicationsByAgentId),
    [commodityApplicationsByAgentId],
  );
  const myAgents = useMemo(
    () => buildMyAgents(currentUserName, commodityApplicationsByAgentId),
    [commodityApplicationsByAgentId, currentUserName],
  );

  const frontisAgents = useMemo(
    () =>
      buildFrontisAgents(
        products,
        currentTenantId,
        latestOrdersByProductId,
        latestFulfillmentsByProductId,
      ),
    [currentTenantId, latestFulfillmentsByProductId, latestOrdersByProductId, products],
  );

  const allAgents = useMemo(
    () =>
      isTeamEdition
        ? [...myAgents, ...teamSharedAgents, ...frontisAgents]
        : [...myAgents, ...frontisAgents],
    [frontisAgents, isTeamEdition, myAgents, teamSharedAgents],
  );

  const filteredAgents = useMemo(
    () =>
      allAgents.filter(agent => {
        if (shelfFilter === "mine" && agent.sourceType !== "mine") {
          return false;
        }

        if (shelfFilter === "teamShare" && agent.sourceType !== "teamShare") {
          return false;
        }

        if (shelfFilter === "frontis" && agent.sourceType !== "frontis") {
          return false;
        }

        if (businessLineFilter !== "all" && agent.businessLine !== businessLineFilter) {
          return false;
        }

        return true;
      }),
    [allAgents, businessLineFilter, shelfFilter],
  );

  const selectedAgent = useMemo(
    () => allAgents.find(agent => agent.id === selectedAgentId) ?? null,
    [allAgents, selectedAgentId],
  );

  const selectedAgentAction = useMemo(
    () => (selectedAgent ? getAgentActionConfig(selectedAgent) : null),
    [selectedAgent],
  );

  const activeOrder = useMemo(
    () => orders.find(item => item.id === activeOrderId) ?? null,
    [activeOrderId, orders],
  );

  const activeOrderAgent = useMemo(
    () =>
      activeOrder
        ? (frontisAgents.find(agent => agent.product?.id === activeOrder.productId) ?? null)
        : null,
    [activeOrder, frontisAgents],
  );

  const activeOrderFulfillment = useMemo(
    () =>
      activeOrder
        ? (fulfillments.find(item => item.orderNo === activeOrder.orderNo) ??
          fulfillments.find(
            item =>
              item.tenantId === activeOrder.tenantId && item.productId === activeOrder.productId,
          ) ??
          null)
        : null,
    [activeOrder, fulfillments],
  );

  const activeOrderStatusMeta = useMemo(
    () => (activeOrder ? getOrderStatusMeta(activeOrder) : null),
    [activeOrder],
  );

  const acquisitionAgent = useMemo(
    () =>
      acquisitionState.agentId
        ? (frontisAgents.find(agent => agent.id === acquisitionState.agentId) ?? null)
        : null,
    [acquisitionState.agentId, frontisAgents],
  );

  const selectedAcquisitionPlan = useMemo(
    () =>
      acquisitionAgent?.product
        ? getSelectedSubscriptionPlan(acquisitionAgent.product, acquisitionState.selectedPlanKey)
        : null,
    [acquisitionAgent?.product, acquisitionState.selectedPlanKey],
  );

  const acquisitionPlans = useMemo(
    () => (acquisitionAgent?.product ? getActiveSubscriptionPlans(acquisitionAgent.product) : []),
    [acquisitionAgent?.product],
  );

  const acquisitionQrImage = useMemo(
    () =>
      buildMockPaymentQr(
        `${acquisitionAgent?.product?.id ?? "none"}-${acquisitionState.orderNo}-${acquisitionState.mode}-${acquisitionState.selectedPlanKey ?? "default"}`,
      ),
    [
      acquisitionAgent?.product?.id,
      acquisitionState.mode,
      acquisitionState.orderNo,
      acquisitionState.selectedPlanKey,
    ],
  );

  const isAcquisitionQrExpired =
    acquisitionState.step === "pay" && acquisitionState.countdownSeconds <= 0;

  const resetAcquisitionState = useCallback((): void => {
    setAcquisitionState(createDefaultAcquisitionState());
  }, []);

  const openAgentDetail = useCallback((agent: StoreAgentItem): void => {
    setSelectedAgentId(agent.id);
  }, []);

  const closeAgentDetail = useCallback((): void => {
    setSelectedAgentId(null);
  }, []);

  const handleOpenCommodityApplication = useCallback(
    (agent: StoreAgentItem): void => {
      if (agent.sourceType !== "mine") {
        return;
      }

      if (!hasAgentListingAccess && !agent.commodityApplication) {
        message.warning(
          "当前租户未开通 AI专家上架服务，可继续开发和企业内使用，暂不能提交商品化申请。",
        );
        return;
      }

      const currentApplication = commodityApplicationsByAgentId.get(agent.id);

      setCommodityDraft({
        agentId: agent.id,
        proposedProductName:
          currentApplication?.proposedProductName?.trim() || `${agent.name} 标准版`,
        reason: currentApplication?.submitReason?.trim() || "",
      });
    },
    [commodityApplicationsByAgentId, hasAgentListingAccess],
  );

  const handleSubmitCommodityApplication = useCallback((): void => {
    if (!commodityDraft) {
      return;
    }

    if (!hasAgentListingAccess) {
      message.warning("当前租户未开通 AI专家上架服务，暂不能提交商品化申请。");
      return;
    }

    const targetAgent = myAgents.find(agent => agent.id === commodityDraft.agentId);

    if (
      !targetAgent ||
      !commodityDraft.proposedProductName.trim() ||
      !commodityDraft.reason.trim()
    ) {
      message.warning("请先补齐商品名与申请说明。");
      return;
    }

    const nextApplication: OperationsAgentSubmission = {
      id: targetAgent.id,
      name: targetAgent.name,
      version: targetAgent.versionLabel,
      submitter: `${currentUserName} - ${currentTenantName}`,
      submittedAt: dayjs().format("YYYY-MM-DD HH:mm"),
      status: "pending",
      submissionType: "commodityApplication",
      proposedProductName: commodityDraft.proposedProductName.trim(),
      submitReason: commodityDraft.reason.trim(),
      targetCustomers: `${targetAgent.businessLineLabel}场景租户`,
      currentScopeLabel: "已发布到 AI专家广场",
      description: targetAgent.summary,
      plazaCategory: targetAgent.businessLineLabel,
    };

    const nextApplications = [
      nextApplication,
      ...commodityApplications.filter(item => item.id !== nextApplication.id),
    ];

    saveEnterpriseCommodityApplications(nextApplications);
    refreshStorefrontState();
    setCommodityDraft(null);
    message.success("已提交商品化申请，运营侧审核后可进入商品中心。");
  }, [
    commodityApplications,
    commodityDraft,
    currentTenantName,
    currentUserName,
    hasAgentListingAccess,
    myAgents,
    refreshStorefrontState,
  ]);

  const openAcquisition = useCallback((agent: StoreAgentItem, mode: AgentAcquisitionMode): void => {
    if (!agent.product) {
      return;
    }

    const defaultPlan = getSelectedSubscriptionPlan(agent.product);

    setAcquisitionState({
      open: true,
      agentId: agent.id,
      mode,
      selectedPlanKey: mode === "purchase" ? defaultPlan?.key : undefined,
      step: "summary",
      orderNo: "",
      countdownSeconds: MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
      isProcessingPayment: false,
    });
  }, []);

  const closeAcquisition = useCallback((): void => {
    resetAcquisitionState();
  }, [resetAcquisitionState]);

  const openOrderDetail = useCallback((orderId: string): void => {
    setActiveOrderId(orderId);
  }, []);

  const closeOrderDetail = useCallback((): void => {
    setActiveOrderId(null);
  }, []);

  const handleAddToWorkspace = useCallback((agentName: string): void => {
    message.success(`${agentName} 已添加到当前工作台。`);
  }, []);

  const completeAcquisition = useCallback(
    (agent: StoreAgentItem, mode: AgentAcquisitionMode, orderNo: string): void => {
      if (!agent.product) {
        return;
      }

      const now = dayjs();
      const nowLabel = now.format("YYYY-MM-DD HH:mm");
      const selectedPlan =
        mode === "purchase"
          ? getSelectedSubscriptionPlan(agent.product, acquisitionState.selectedPlanKey)
          : null;
      const expiresAt =
        mode === "trial" && agent.product.trialUnit && agent.product.trialValue
          ? agent.product.trialUnit === "day"
            ? now.add(agent.product.trialValue, "day").format("YYYY-MM-DD HH:mm")
            : now.add(1, "month").format("YYYY-MM-DD HH:mm")
          : selectedPlan
            ? getSubscriptionPlanExpiresAt(selectedPlan.key, now)
            : agent.product.billingSpec === "year"
              ? now.add(1, "year").format("YYYY-MM-DD HH:mm")
              : agent.product.billingSpec === "month"
                ? now.add(1, "month").format("YYYY-MM-DD HH:mm")
                : undefined;

      const nextFulfillment: OperationsFulfillment = {
        id: `ops-fulfillment-frontis-${Date.now()}`,
        orderNo,
        tenantId: currentTenantId,
        tenantName: currentTenantName,
        productId: agent.product.id,
        productName: agent.product.name,
        deliveryKind: agent.product.deliveryKind,
        quantity: 1,
        status: "active",
        resourcePoolId: agent.product.resourcePoolId,
        resourcePoolName: agent.product.resourcePoolName,
        allocationTarget: `已开通至 ${currentTenantName}`,
        startsAt: nowLabel,
        expiresAt,
        updatedAt: nowLabel,
      };
      const nextFulfillments = [
        nextFulfillment,
        ...fulfillments.filter(
          item =>
            !(
              item.tenantId === currentTenantId &&
              item.productId === agent.product?.id &&
              ACTIVE_FULFILLMENT_STATUSES.has(item.status)
            ),
        ),
      ];

      saveStoredOperationsFulfillments(nextFulfillments);

      let createdOrderId: string | undefined;

      if (mode !== "free") {
        const purchasePriceLabel =
          mode === "trial"
            ? (agent.trialLabel ?? "免费试用")
            : getProductPriceLabel(agent.product, selectedPlan?.key);
        const nextOrder: EnterpriseAgentOrderRecord = {
          id: `agent-order-${Date.now()}`,
          tenantId: currentTenantId,
          tenantName: currentTenantName,
          productId: agent.product.id,
          productName: agent.product.name,
          agentName: agent.name,
          orderNo,
          orderType: mode === "trial" ? "trial" : "purchase",
          status: mode === "trial" ? "trialing" : "active",
          amount: mode === "trial" ? 0 : (selectedPlan?.price ?? agent.product.price ?? 0),
          priceLabel: purchasePriceLabel,
          subscriptionPlanKey: selectedPlan?.key,
          subscriptionPlanLabel: selectedPlan?.title,
          subscriptionDurationLabel: selectedPlan?.durationLabel,
          paymentChannelLabel: mode === "purchase" ? "统一扫码支付" : "试用开通",
          purchaserName: currentUserName,
          createdAt: nowLabel,
          startsAt: nowLabel,
          paidAt: mode === "purchase" ? nowLabel : undefined,
          expiresAt,
        };

        createdOrderId = nextOrder.id;
        saveEnterpriseAgentOrders([nextOrder, ...orders]);
      }

      refreshStorefrontState();

      setAcquisitionState(currentState => ({
        ...currentState,
        step: "success",
        isProcessingPayment: false,
        completedOrderId: createdOrderId,
        orderNo,
      }));

      if (mode === "free") {
        message.success(`${agent.name} 已免费开通到 ${currentTenantPurchaseName}。`);
        return;
      }

      if (mode === "trial") {
        message.success(`${agent.name} 已开通试用。`);
        return;
      }

      message.success(`${agent.name} 已订阅成功并开通到 ${currentTenantPurchaseName}。`);
    },
    [
      acquisitionState.selectedPlanKey,
      currentTenantId,
      currentTenantName,
      currentTenantPurchaseName,
      currentUserName,
      fulfillments,
      orders,
      refreshStorefrontState,
    ],
  );

  const handleStartPurchaseQr = useCallback(
    (planKey?: OperationsProductSubscriptionPlanKey): void => {
      if (!acquisitionAgent?.product) {
        return;
      }

      setAcquisitionState(currentState => ({
        ...currentState,
        selectedPlanKey: planKey ?? currentState.selectedPlanKey,
        step: "pay",
        orderNo: buildMockPaymentOrderId("agt"),
        countdownSeconds: MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
        isProcessingPayment: false,
      }));
    },
    [acquisitionAgent?.product],
  );

  const handleRestartPurchaseQr = useCallback((): void => {
    setAcquisitionState(currentState => ({
      ...currentState,
      orderNo: buildMockPaymentOrderId("agt"),
      countdownSeconds: MOCK_PAYMENT_QR_COUNTDOWN_SECONDS,
      isProcessingPayment: false,
    }));
  }, []);

  const handlePayByQr = useCallback((): void => {
    if (!acquisitionAgent || isAcquisitionQrExpired || acquisitionState.isProcessingPayment) {
      return;
    }

    setAcquisitionState(currentState => ({
      ...currentState,
      isProcessingPayment: true,
    }));

    window.setTimeout(() => {
      completeAcquisition(acquisitionAgent, "purchase", acquisitionState.orderNo);
    }, 700);
  }, [
    acquisitionAgent,
    acquisitionState.isProcessingPayment,
    acquisitionState.orderNo,
    completeAcquisition,
    isAcquisitionQrExpired,
  ]);

  const handlePrimaryAction = useCallback(
    (agent: StoreAgentItem, action: AgentActionKind): void => {
      if (action === "addWorkspace") {
        handleAddToWorkspace(agent.name);
        return;
      }

      if (action === "openFree") {
        openAcquisition(agent, "free");
        return;
      }

      if (action === "openTrial") {
        openAcquisition(agent, "trial");
        return;
      }

      if (action === "openPurchase") {
        openAcquisition(agent, "purchase");
        return;
      }

      if (action === "viewOrder" && agent.order) {
        openOrderDetail(agent.order.id);
        return;
      }

      return;
    },
    [handleAddToWorkspace, openAcquisition, openOrderDetail],
  );

  const detailContent = useMemo((): JSX.Element | null => {
    if (!selectedAgent) {
      return null;
    }

    return (
      <div className={styles.detailPaneBody}>
        <div className={styles.detailPlaceholderLabel}>{selectedAgent.name}</div>
        <div className={styles.detailPlaceholderCard}>
          <p>AI专家详情不分功能和展现信息参考原型稿设计</p>
        </div>
      </div>
    );
  }, [selectedAgent]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbarCard}>
        <div className={styles.filterGroup}>
          <Select
            className={styles.filterSelect}
            options={shelfFilterOptions}
            popupMatchSelectWidth={false}
            value={shelfFilter}
            onChange={value => setShelfFilter(value)}
          />
          <Select
            className={styles.filterSelect}
            options={businessLineOptions}
            popupMatchSelectWidth={false}
            value={businessLineFilter}
            onChange={value => setBusinessLineFilter(value)}
          />
        </div>

        {isAdminView && onNavigateToAgentDev ? (
          <Button className={styles.createButton} type="primary" onClick={onNavigateToAgentDev}>
            <PlusOutlined />
            开发AI专家
          </Button>
        ) : null}
      </div>

      <div className={styles.agentGrid}>
        {filteredAgents.map(agent => {
          const actionConfig = getAgentActionConfig(agent);
          const orderStatusMeta = agent.order ? getOrderStatusMeta(agent.order) : null;

          return (
            <article key={agent.id} className={styles.agentCard}>
              <button
                type="button"
                className={styles.cardPreviewButton}
                onClick={() => openAgentDetail(agent)}
              >
                <div
                  className={styles.visualPanel}
                  style={{ background: getDomainTone(agent.businessLine) }}
                >
                  <span className={styles.visibilityBadge}>{getVisibilityLabel(agent)}</span>
                  <div className={styles.visualGlow} />
                  <img
                    alt={agent.name}
                    className={styles.agentPortrait}
                    src={getAvatarUrl(agent.visualSeed)}
                  />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{agent.name}</h3>
                    <div className={styles.cardVersionMeta}>
                      <span className={styles.versionBadge}>{agent.versionLabel}</span>
                      {orderStatusMeta ? (
                        <span
                          className={`${styles.orderStatusBadge} ${getOrderStatusClassName(
                            orderStatusMeta.tone,
                          )}`}
                        >
                          {orderStatusMeta.label}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.badgeRow}>
                    <span className={`${styles.miniBadge} ${styles.domainBadge}`}>
                      {agent.businessLineLabel}
                    </span>
                    <span className={`${styles.miniBadge} ${styles.scopeBadge}`}>
                      {agent.acquisitionLabel}
                    </span>
                  </div>

                  <p className={styles.agentDescription}>{agent.summary}</p>

                  <div className={styles.cardDeliveryInfo}>
                    <strong>{getCardContextLabel(agent)}</strong>
                    <span>{getCardContextMeta(agent)}</span>
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
                  onClick={() => handlePrimaryAction(agent, actionConfig.primaryAction)}
                >
                  {actionConfig.primaryLabel}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {!filteredAgents.length ? (
        <div className={styles.emptyState}>当前筛选条件下暂无可浏览的 AI 专家。</div>
      ) : null}

      <Modal
        className={styles.detailModal}
        wrapClassName={styles.detailModalWrap}
        destroyOnClose={true}
        footer={null}
        onCancel={closeAgentDetail}
        open={Boolean(selectedAgent)}
        title={
          <span className={styles.detailModalTitle}>{selectedAgent?.name ?? "AI 专家详情"}</span>
        }
        width={680}
      >
        {selectedAgent ? (
          <div className={styles.detailShell}>
            <div className={styles.detailScrollArea}>{detailContent}</div>

            <div className={styles.detailActionBar}>
              <div className={styles.detailActionButtons}>
                {selectedAgent.sourceType === "mine" ? (
                  <Button
                    className={styles.detailSecondaryButton}
                    onClick={() => handleOpenCommodityApplication(selectedAgent)}
                  >
                    {selectedAgent.commodityApplication ? "查看商品化申请" : "申请商品化"}
                  </Button>
                ) : null}
                {selectedAgentAction?.secondaryLabel ? (
                  <Button
                    className={styles.detailSecondaryButton}
                    onClick={() =>
                      handlePrimaryAction(selectedAgent, selectedAgentAction.secondaryAction!)
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
                      handlePrimaryAction(selectedAgent, selectedAgentAction.primaryAction)
                    }
                  >
                    {selectedAgentAction.primaryLabel}
                  </Button>
                ) : null}
                <Button
                  className={styles.detailCloseButton}
                  type="primary"
                  onClick={closeAgentDetail}
                >
                  关闭
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.orderRequestModal}
        destroyOnClose={true}
        footer={null}
        onCancel={() => setCommodityDraft(null)}
        open={Boolean(commodityDraft)}
        title={<span className={styles.detailModalTitle}>申请进入 FrontisAI 发布</span>}
        width={560}
      >
        {commodityDraft ? (
          <div className={styles.orderRequestBody}>
            <div className={styles.orderRequestSummary}>
              <div>
                <strong>
                  {myAgents.find(agent => agent.id === commodityDraft.agentId)?.name ?? "AI专家"}
                </strong>
                <span>当前为我开发的 AI专家，可申请进入商品中心</span>
              </div>
              <span className={styles.detailMetaChip}>
                {getCommodityApplicationStatusLabel(
                  commodityApplicationsByAgentId.get(commodityDraft.agentId),
                )}
              </span>
            </div>

            <div className={styles.orderFormGrid}>
              <div className={styles.orderFormItem}>
                <span className={styles.orderFormLabel}>拟上架商品名</span>
                <Input
                  value={commodityDraft.proposedProductName}
                  onChange={event =>
                    setCommodityDraft(currentDraft =>
                      currentDraft
                        ? {
                            ...currentDraft,
                            proposedProductName: event.target.value,
                          }
                        : null,
                    )
                  }
                />
              </div>
              <div className={`${styles.orderFormItem} ${styles.orderFormItemFull}`}>
                <span className={styles.orderFormLabel}>申请说明</span>
                <Input.TextArea
                  rows={4}
                  value={commodityDraft.reason}
                  placeholder="说明为什么适合进入 FrontisAI 发布商品体系"
                  onChange={event =>
                    setCommodityDraft(currentDraft =>
                      currentDraft
                        ? {
                            ...currentDraft,
                            reason: event.target.value,
                          }
                        : null,
                    )
                  }
                />
              </div>
            </div>

            <div className={styles.orderRequestFooter}>
              <Button onClick={() => setCommodityDraft(null)}>取消</Button>
              <Button type="primary" onClick={handleSubmitCommodityApplication}>
                提交申请
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.orderRequestModal}
        destroyOnClose={true}
        footer={null}
        onCancel={closeAcquisition}
        open={acquisitionState.open && Boolean(acquisitionAgent)}
        title={
          <span className={styles.detailModalTitle}>
            {acquisitionState.mode === "purchase"
              ? "订阅 AI 专家"
              : acquisitionState.mode === "trial"
                ? "开通试用"
                : "免费获取"}
          </span>
        }
        width={acquisitionState.mode === "purchase" && acquisitionPlans.length >= 2 ? 920 : 580}
      >
        {acquisitionAgent ? (
          <div className={styles.orderRequestBody}>
            {acquisitionState.step === "summary" ? (
              <>
                <div className={styles.orderRequestSummary}>
                  <div>
                    <strong>{acquisitionAgent.name}</strong>
                    <span>{acquisitionAgent.product?.name ?? acquisitionAgent.name}</span>
                  </div>
                  <span className={styles.detailMetaChip}>
                    {acquisitionState.mode === "purchase"
                      ? `为${currentTenantPurchaseName}购买`
                      : acquisitionState.mode === "trial"
                        ? (acquisitionAgent.trialLabel ?? "免费试用")
                        : "免费领取"}
                  </span>
                </div>

                {acquisitionState.mode === "purchase" && acquisitionPlans.length ? (
                  <div className={styles.subscriptionPlanGrid}>
                    {acquisitionPlans.map(plan => {
                      const isSelected = selectedAcquisitionPlan?.key === plan.key;
                      const averagePriceLabel = getSubscriptionPlanAveragePriceLabel(plan);

                      return (
                        <div
                          key={plan.key}
                          className={`${styles.subscriptionPlanCard} ${
                            isSelected ? styles.subscriptionPlanCardSelected : ""
                          }`}
                        >
                          <div className={styles.subscriptionPlanCardHeader}>
                            <div>
                              <div className={styles.subscriptionPlanTitleRow}>
                                <strong className={styles.subscriptionPlanTitle}>
                                  {plan.title}
                                </strong>
                                {plan.tagLabel ? (
                                  <span className={styles.subscriptionPlanTag}>
                                    {plan.tagLabel}
                                  </span>
                                ) : null}
                              </div>
                              <p className={styles.subscriptionPlanDescription}>
                                {plan.description}
                              </p>
                            </div>
                          </div>

                          <div className={styles.subscriptionPlanPriceBlock}>
                            <div className={styles.subscriptionPlanPriceRow}>
                              <strong className={styles.subscriptionPlanPrice}>
                                ¥{plan.price.toLocaleString("zh-CN")}
                              </strong>
                              {plan.originalPrice ? (
                                <span className={styles.subscriptionPlanOriginalPrice}>
                                  ¥{plan.originalPrice.toLocaleString("zh-CN")}
                                </span>
                              ) : null}
                            </div>
                            <div className={styles.subscriptionPlanMetaRow}>
                              <span>{plan.durationLabel}</span>
                              {averagePriceLabel ? <span>{averagePriceLabel}</span> : null}
                            </div>
                          </div>

                          <ul className={styles.subscriptionPlanFeatureList}>
                            <li>{getSubscriptionPlanValidityLabel(plan)}</li>
                            <li>支付后立即为{currentTenantPurchaseName}开通</li>
                            <li>{plan.description}</li>
                          </ul>

                          <Button
                            block
                            type={isSelected ? "primary" : "default"}
                            onClick={() => handleStartPurchaseQr(plan.key)}
                          >
                            订阅
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {acquisitionState.mode === "purchase" && !acquisitionPlans.length ? (
                  <div className={styles.detailProcurementCard}>
                    <div className={styles.detailKeyValueGrid}>
                      <div className={styles.detailKeyValueItem}>
                        <span className={styles.detailKeyValueLabel}>购买对象</span>
                        <strong className={styles.detailKeyValueValue}>
                          为{currentTenantPurchaseName}购买
                        </strong>
                      </div>
                      <div className={styles.detailKeyValueItem}>
                        <span className={styles.detailKeyValueLabel}>支付金额</span>
                        <strong className={styles.detailKeyValueValue}>
                          {getProductPriceLabel(acquisitionAgent.product!)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                {acquisitionState.mode !== "purchase" ? (
                  <div className={styles.detailProcurementCard}>
                    <div className={styles.detailKeyValueGrid}>
                      <div className={styles.detailKeyValueItem}>
                        <span className={styles.detailKeyValueLabel}>开通对象</span>
                        <strong className={styles.detailKeyValueValue}>
                          为{currentTenantPurchaseName}开通
                        </strong>
                      </div>
                      <div className={styles.detailKeyValueItem}>
                        <span className={styles.detailKeyValueLabel}>获取方式</span>
                        <strong className={styles.detailKeyValueValue}>
                          {acquisitionState.mode === "trial" ? "免费试用" : "免费领取"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className={styles.orderRequestFooter}>
                  <Button onClick={closeAcquisition}>取消</Button>
                  {acquisitionState.mode === "purchase" && !acquisitionPlans.length ? (
                    <Button type="primary" onClick={() => handleStartPurchaseQr()}>
                      订阅
                    </Button>
                  ) : null}
                  {acquisitionState.mode !== "purchase" ? (
                    <Button
                      type="primary"
                      onClick={() =>
                        completeAcquisition(
                          acquisitionAgent,
                          acquisitionState.mode,
                          buildMockPaymentOrderId(
                            acquisitionState.mode === "trial" ? "trial" : "free",
                          ),
                        )
                      }
                    >
                      {acquisitionState.mode === "trial" ? "确认试用" : "确认领取"}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}

            {acquisitionState.step === "pay" ? (
              <>
                <div className={styles.commercePayHeader}>
                  <div>
                    <div className={styles.commercePayTitle}>扫码支付</div>
                    <div className={styles.commercePayAmount}>
                      {getProductPriceLabel(
                        acquisitionAgent.product!,
                        selectedAcquisitionPlan?.key,
                      )}
                    </div>
                  </div>
                  <div className={styles.commercePayCountdown}>
                    {isAcquisitionQrExpired
                      ? "二维码已过期"
                      : formatMockPaymentCountdown(acquisitionState.countdownSeconds)}
                  </div>
                </div>

                {selectedAcquisitionPlan ? (
                  <div className={styles.commercePayPlanMeta}>
                    <strong>{acquisitionAgent.name}</strong>
                    <span>
                      {selectedAcquisitionPlan.title} · {selectedAcquisitionPlan.durationLabel}
                    </span>
                    <span>为{currentTenantPurchaseName}购买</span>
                  </div>
                ) : null}

                <div className={styles.commerceQrWrap}>
                  <div className={styles.commerceQrCard}>
                    <button
                      type="button"
                      className={styles.commerceQrButton}
                      disabled={isAcquisitionQrExpired || acquisitionState.isProcessingPayment}
                      onClick={handlePayByQr}
                    >
                      <img
                        alt="AI专家购买支付二维码"
                        className={styles.commerceQrImage}
                        src={acquisitionQrImage}
                      />
                    </button>
                  </div>
                </div>

                <div className={styles.commercePayFooter}>
                  <div className={styles.commercePayHint}>
                    {acquisitionState.isProcessingPayment
                      ? `支付处理中，支付成功后将自动为${currentTenantPurchaseName}开通。`
                      : "点击二维码即可模拟扫码支付，支付完成后自动到账开通。"}
                  </div>
                </div>

                <div className={styles.orderRequestFooter}>
                  <Button
                    onClick={() =>
                      setAcquisitionState(currentState => ({ ...currentState, step: "summary" }))
                    }
                  >
                    返回
                  </Button>
                  {isAcquisitionQrExpired ? (
                    <Button type="primary" onClick={handleRestartPurchaseQr}>
                      重新生成二维码
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}

            {acquisitionState.step === "success" ? (
              <div className={styles.commerceSuccessPanel}>
                <CheckCircleOutlined className={styles.commerceSuccessIcon} />
                <h3 className={styles.commerceSuccessTitle}>
                  {acquisitionState.mode === "purchase"
                    ? "订阅成功"
                    : acquisitionState.mode === "trial"
                      ? "试用已开通"
                      : "领取成功"}
                </h3>
                <p className={styles.commerceSuccessText}>
                  {acquisitionAgent.name} 已为{currentTenantPurchaseName}开通。
                </p>
                <div className={styles.detailProcurementCard}>
                  <div className={styles.detailKeyValueGrid}>
                    <div className={styles.detailKeyValueItem}>
                      <span className={styles.detailKeyValueLabel}>开通对象</span>
                      <strong className={styles.detailKeyValueValue}>
                        {currentTenantPurchaseName}
                      </strong>
                    </div>
                    {selectedAcquisitionPlan ? (
                      <div className={styles.detailKeyValueItem}>
                        <span className={styles.detailKeyValueLabel}>订阅方案</span>
                        <strong className={styles.detailKeyValueValue}>
                          {selectedAcquisitionPlan.title} · {selectedAcquisitionPlan.durationLabel}
                        </strong>
                      </div>
                    ) : null}
                    <div className={styles.detailKeyValueItem}>
                      <span className={styles.detailKeyValueLabel}>订单号</span>
                      <strong className={styles.detailKeyValueValue}>
                        {acquisitionState.completedOrderId ? acquisitionState.orderNo : "无需订单"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={styles.orderRequestFooter}>
                  {acquisitionState.completedOrderId ? (
                    <Button
                      onClick={() => {
                        const completedOrderId = acquisitionState.completedOrderId;
                        closeAcquisition();
                        if (completedOrderId) {
                          openOrderDetail(completedOrderId);
                        }
                      }}
                    >
                      查看订单
                    </Button>
                  ) : null}
                  <Button type="primary" onClick={closeAcquisition}>
                    关闭
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.orderDetailModal}
        destroyOnClose={true}
        footer={null}
        onCancel={closeOrderDetail}
        open={Boolean(activeOrder && activeOrderAgent && activeOrderStatusMeta)}
        title={
          <span className={styles.detailModalTitle}>{activeOrder?.orderNo ?? "订单详情"}</span>
        }
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
                className={`${styles.orderStatusBadge} ${getOrderStatusClassName(
                  activeOrderStatusMeta.tone,
                )}`}
              >
                {activeOrderStatusMeta.label}
              </span>
            </div>

            <div className={styles.orderStepList}>
              {getOrderStepItems(activeOrder).map(item => (
                <div
                  key={item.key}
                  className={`${styles.orderStepItem} ${
                    item.done
                      ? styles.orderStepItemDone
                      : item.current
                        ? styles.orderStepItemCurrent
                        : ""
                  }`}
                >
                  <span className={styles.orderStepDot} />
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>

            <div className={styles.orderDetailGrid}>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>租户</span>
                <strong>{activeOrder.tenantName}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>购买人</span>
                <strong>{activeOrder.purchaserName}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>商品</span>
                <strong>{activeOrder.productName}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>金额</span>
                <strong>{activeOrder.priceLabel}</strong>
              </div>
              {activeOrder.subscriptionPlanLabel ? (
                <div className={styles.orderDetailItem}>
                  <span className={styles.orderDetailLabel}>订阅方案</span>
                  <strong>
                    {activeOrder.subscriptionPlanLabel}
                    {activeOrder.subscriptionDurationLabel
                      ? ` · ${activeOrder.subscriptionDurationLabel}`
                      : ""}
                  </strong>
                </div>
              ) : null}
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>创建时间</span>
                <strong>{activeOrder.createdAt}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>支付时间</span>
                <strong>{activeOrder.paidAt ?? "未支付"}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>开通时间</span>
                <strong>{activeOrder.startsAt}</strong>
              </div>
              <div className={styles.orderDetailItem}>
                <span className={styles.orderDetailLabel}>有效期</span>
                <strong>{activeOrder.expiresAt ?? "长期有效"}</strong>
              </div>
              <div className={`${styles.orderDetailItem} ${styles.orderDetailItemFull}`}>
                <span className={styles.orderDetailLabel}>开通结果</span>
                <strong>
                  {activeOrderFulfillment
                    ? `${activeOrderFulfillment.allocationTarget}${
                        activeOrderFulfillment.resourcePoolName
                          ? ` · ${activeOrderFulfillment.resourcePoolName}`
                          : ""
                      }`
                    : "当前订单已支付，等待开通同步。"}
                </strong>
              </div>
            </div>

            <div className={styles.orderRequestFooter}>
              {activeOrder.orderType === "trial" ? (
                <Button
                  type="primary"
                  onClick={() => {
                    closeOrderDetail();
                    openAcquisition(activeOrderAgent, "purchase");
                  }}
                >
                  立即订阅
                </Button>
              ) : null}
              <Button onClick={closeOrderDetail}>关闭</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
