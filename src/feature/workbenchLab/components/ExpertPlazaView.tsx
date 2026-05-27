import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  FileTextOutlined,
  LineChartOutlined,
  ProfileOutlined,
  SlidersOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Empty, Modal, Popconfirm, QRCode, Tooltip, message } from "antd";
import classNames from "classnames";
import dayjs from "dayjs";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import { loadEnterpriseCommodityApplications } from "@/feature/workbenchLab/commodityApplications";
import { WORKBENCH_AGENT_STORE_ITEMS } from "@/feature/workbenchLab/mockData";
import {
  loadStoredOperationsFulfillments,
  loadStoredOperationsProducts,
} from "@/feature/operations/commerceStorage";
import { loadOperationsServiceContactConfig } from "@/feature/operations/platformConfigStorage";
import {
  loadStoredAgentPlazaCategories,
  loadStoredAgentStoreZones,
} from "@/feature/operations/agentPlazaCategoryStorage";
import { OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY } from "@/feature/operations/mockData";
import {
  TENANT_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";
import {
  loadWorkbenchAgentRecords,
  upsertWorkbenchAgentRecord,
  WORKBENCH_AGENT_RECORDS_UPDATED_EVENT,
} from "@/feature/workbenchLab/workbenchAgentsStorage";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentStoreZoneOption,
  OperationsAgentSubmission,
  OperationsFulfillment,
  OperationsProduct,
  OperationsProductDeliveryKind,
  OperationsServiceContactConfig,
} from "@/feature/operations/types";
import { getAvatarUrl } from "@/pages/utils";
import commerceGrowthExpertAvatar from "@/assets/images/ai-experts/commerce-growth-expert.png";
import knowledgeGovernanceExpertAvatar from "@/assets/images/ai-experts/knowledge-governance-expert.png";

import styles from "./ExpertPlazaView.module.less";

type TeamExpertFilter = "all" | "mine" | "teamShare";
type StoreSystemCategoryKey = string;
type SceneCategoryFilter = "all" | BusinessLineKey;
export type BusinessLineKey = OperationsAgentPlazaCategoryOption["name"];
type AgentSourceType = "mine" | "teamShare" | "frontis";
type ExpertPlazaMode = "store" | "team";
type AgentDetailTab = "identity" | "tools" | "skills" | "growth" | "files";
type AgentCoreFileKey = "soulMarkdown" | "memoryMarkdown" | "userMarkdown";

interface AgentCapability {
  name: string;
  description: string;
}

interface AgentVersionItem {
  label: string;
  description: string;
  date: string;
  current?: boolean;
}

interface AgentToolItem {
  name: string;
  description: string;
  enabled: boolean;
}

interface AgentEvolutionPoint {
  label: string;
  value: number;
}

interface AgentEvolutionPathItem {
  title: string;
  description: string;
  status: "done" | "active" | "locked";
}

interface AgentEvolutionEvidenceItem {
  title: string;
  description: string;
  source: string;
}

interface AgentEvolutionRecord {
  curve: AgentEvolutionPoint[];
  path: AgentEvolutionPathItem[];
  evidence: AgentEvolutionEvidenceItem[];
}

interface AgentCoreFile {
  key: AgentCoreFileKey;
  name: string;
  description: string;
  content: string;
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
  displayName?: string;
  avatarUrl?: string;
  expertTitle: string;
  audienceLabel: string;
  businessLine: BusinessLineKey;
  businessLineLabel: string;
  storeCategory: StoreSystemCategoryKey;
  summary: string;
  scene: string;
  techShape: string;
  model: string;
  runtime: string;
  capabilities: AgentCapability[];
}

export interface StoreAgentItem {
  id: string;
  sourceType: AgentSourceType;
  visualSeed: string;
  avatarUrl?: string;
  name: string;
  expertTitle: string;
  audienceLabel: string;
  versionLabel: string;
  businessLine: BusinessLineKey;
  businessLineLabel: string;
  storeCategory?: StoreSystemCategoryKey;
  storeCategories?: StoreSystemCategoryKey[];
  sceneCategoriesByZone?: Record<StoreSystemCategoryKey, BusinessLineKey>;
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
  fulfillment?: OperationsFulfillment | null;
  commodityApplication?: OperationsAgentSubmission | null;
}

interface ExpertPlazaViewProps {
  mode?: ExpertPlazaMode;
  onUseAgent?: (agentId: string) => void;
}

interface ContactModalInfo {
  enabled: boolean;
  contactName: string;
  qrCodeValue: string;
  remark: string;
}

const DEFAULT_TENANT_ID = "tenant-enterprise-demo";
const ACTIVE_FULFILLMENT_STATUSES = new Set<OperationsFulfillment["status"]>([
  "active",
  "completed",
]);

const TEAM_EXPERT_FILTER_OPTIONS: Array<{ label: string; value: TeamExpertFilter }> = [
  { label: "全部", value: "all" },
  { label: "我的", value: "mine" },
  { label: "团队共享", value: "teamShare" },
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
    summary:
      "Aiden，资深销售顾问出身的客户沟通教练。长期陪跑一线销售团队，擅长把客户画像、异议记录和历史对话翻译成下一轮可直接开口的话术，帮你在预算、价值和决策风险之间找到更稳的推进方式。",
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
        description: "识别客户当前关注点与成交阻力。",
      },
      {
        name: "话术生成",
        description: "根据场景自动生成沟通脚本和回复建议。",
      },
      {
        name: "历史对话召回",
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
    summary:
      "Mira，客户成功体系出身的商机节奏教练。熟悉销售漏斗和客户成功协作节奏，会盯住每个商机的停留时长、关键联系人和下一步动作，在机会变冷前提醒你补材料、换触点或升级协同。",
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
        description: "监控商机阶段停留时长并生成提醒。",
      },
      {
        name: "跟进动作建议",
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
    summary:
      "Ethan，交付 PMO 出身的项目风险教练。具备 PMO 式的交付视角，习惯从里程碑、资源占用和客户确认链路里提前发现风险，帮项目负责人把周报、阻塞项和下一步责任人说清楚。",
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
        description: "识别延期风险并追踪关键里程碑。",
      },
      {
        name: "周报生成",
        description: "自动汇总项目状态并输出周报。",
      },
      {
        name: "风险预警",
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
    summary:
      "Lex，企业法务支持出身的合同风险教练。熟悉销售、采购和服务合同的常见风险点，会先抓付款、违约、责任边界和交付承诺，再把风险等级、修改建议和需人工确认的条款整理成可复核结论。",
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
        description: "识别付款、违约、责任边界等关键条款。",
      },
      {
        name: "审查建议",
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
    displayName: "电商经营增长专家",
    avatarUrl: commerceGrowthExpertAvatar,
    expertTitle: "商品增长策略与内容转化顾问",
    audienceLabel: "适用：品牌电商 / 内容运营 / 投放团队",
    businessLine: "销售",
    businessLineLabel: "销售",
    storeCategory: "roleZone",
    summary: "拆解商品定位、转化路径和投放素材，帮助团队把商品策略沉淀为可执行的运营动作。",
    scene: "商品运营",
    techShape: "创作型",
    model: "GPT-4.1",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "商品定位",
        description: "从商品、竞品和人群场景中提炼可转化卖点。",
      },
      {
        name: "转化策略",
        description: "输出主图、详情页、活动页和短内容脚本结构。",
      },
      {
        name: "投放复盘",
        description: "基于活动目标拆解投放切入点、素材节奏和复盘指标。",
      },
    ],
  },
  客户对账核验助手: {
    displayName: "交易对账核验专家",
    avatarUrl: knowledgeGovernanceExpertAvatar,
    expertTitle: "财务对账与异常归因顾问",
    audienceLabel: "适用：财务共享 / 运营结算 / 客户成功",
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    storeCategory: "industryExpert",
    summary: "交叉核验账单、交易流水和结算规则，定位差异原因并形成可追溯的处理结论。",
    scene: "财务对账",
    techShape: "核验型",
    model: "Claude Sonnet 4.6",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "差异识别",
        description: "自动比对账单和流水，识别差异项。",
      },
      {
        name: "归因结论",
        description: "输出对账异常清单和核验建议。",
      },
      {
        name: "证据追溯",
        description: "保留核验过程中的关键证据和异常记录。",
      },
    ],
  },
  制度问答助手: {
    displayName: "企业知识治理专家",
    avatarUrl: knowledgeGovernanceExpertAvatar,
    expertTitle: "制度知识库与组织规范顾问",
    audienceLabel: "适用：集团制度治理 / HRBP / 运营支持",
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    storeCategory: "roleZone",
    summary: "沉淀制度知识、统一问答口径、识别流程冲突，帮助组织把分散制度变成可追溯的知识服务。",
    scene: "制度问答",
    techShape: "问答型",
    model: "Kimi 企业版",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "制度治理",
        description: "检索制度、流程和组织规范，识别过期或冲突口径。",
      },
      {
        name: "问答溯源",
        description: "基于制度来源输出可追溯回答，统一员工咨询口径。",
      },
    ],
  },
  供应计划协调专家: {
    expertTitle: "供应计划与产销协同顾问",
    audienceLabel: "适用：计划部 / 采购协同 / 生产排程",
    businessLine: "供应链",
    businessLineLabel: "供应链",
    storeCategory: "industryExpert",
    summary: "联动销售预测、库存水位和产能约束，识别缺料风险、排产冲突和补货优先级。",
    scene: "供应计划",
    techShape: "协同型",
    model: "Claude Sonnet 4.6",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "缺料风险识别",
        description: "对照库存、采购到货和生产需求，提前识别缺口。",
      },
      {
        name: "产销协同建议",
        description: "把销售预测和产能约束转成可讨论的排产建议。",
      },
      {
        name: "补货优先级",
        description: "按订单价值、交期和风险等级生成补货优先级。",
      },
    ],
  },
  质量异常根因专家: {
    expertTitle: "质量问题归因与 CAPA 顾问",
    audienceLabel: "适用：质量管理 / 生产工艺 / 售后服务",
    businessLine: "生产",
    businessLineLabel: "生产",
    storeCategory: "industryExpert",
    summary: "聚合质检记录、工艺参数和售后反馈，帮助团队定位质量异常根因并形成纠正预防措施。",
    scene: "质量异常",
    techShape: "分析型",
    model: "GPT-4.1",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "异常聚类",
        description: "把分散质检和客诉问题聚合为可分析的问题簇。",
      },
      {
        name: "根因推断",
        description: "结合工艺、批次、供应商和班组信息输出可能根因。",
      },
      {
        name: "CAPA 生成",
        description: "形成纠正措施、预防措施和责任跟踪建议。",
      },
    ],
  },
  客户成功续约专家: {
    expertTitle: "客户健康度与续约策略顾问",
    audienceLabel: "适用：客户成功 / 大客户销售 / 服务运营",
    businessLine: "销售",
    businessLineLabel: "销售",
    storeCategory: "roleZone",
    summary: "基于产品使用、服务记录和沟通历史，判断续约风险并生成分层跟进策略。",
    scene: "续约经营",
    techShape: "策略型",
    model: "Claude Sonnet 4.6",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "健康度诊断",
        description: "评估活跃、价值实现、服务风险和关键人关系。",
      },
      {
        name: "续约风险预警",
        description: "识别续约阻力、流失信号和待补齐证据。",
      },
      {
        name: "跟进策略",
        description: "输出分层触达计划、会议议程和客户价值复盘材料。",
      },
    ],
  },
  招投标响应专家: {
    expertTitle: "招标文件解析与响应策略顾问",
    audienceLabel: "适用：售前团队 / 解决方案 / 标书协作",
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    storeCategory: "roleZone",
    summary: "解析招标文件、提炼评分点和响应差距，辅助团队形成投标材料结构和风险清单。",
    scene: "投标响应",
    techShape: "文档型",
    model: "GPT-4.1",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "评分点提取",
        description: "识别评分规则、硬性门槛和关键响应要求。",
      },
      {
        name: "差距分析",
        description: "对照企业能力和历史材料生成响应差距清单。",
      },
      {
        name: "标书结构",
        description: "形成章节结构、证据材料和风险提示。",
      },
    ],
  },
  门店营运督导专家: {
    expertTitle: "门店经营诊断与整改顾问",
    audienceLabel: "适用：连锁门店 / 区域督导 / 零售运营",
    businessLine: "销售",
    businessLineLabel: "销售",
    storeCategory: "industryExpert",
    summary: "汇总巡检、销售、客诉和活动数据，输出门店问题清单、整改建议和复盘重点。",
    scene: "门店营运",
    techShape: "诊断型",
    model: "Claude Sonnet 4.6",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "门店问题归纳",
        description: "把巡检、销售和客诉记录归并为重点问题。",
      },
      {
        name: "整改建议",
        description: "按影响程度输出可执行的整改动作和责任分配。",
      },
      {
        name: "复盘报告",
        description: "生成区域督导视角的复盘摘要和跟踪指标。",
      },
    ],
  },
  采购谈判策略专家: {
    expertTitle: "供应商谈判与采购风险顾问",
    audienceLabel: "适用：采购团队 / 供应商管理 / 法务协同",
    businessLine: "供应链",
    businessLineLabel: "供应链",
    storeCategory: "roleZone",
    summary: "结合供应商画像、历史价格和合同条款，输出采购谈判策略、让步边界和风险提示。",
    scene: "采购谈判",
    techShape: "策略型",
    model: "GPT-4.1",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "价格基线分析",
        description: "对比历史采购价、市场区间和供应商报价结构。",
      },
      {
        name: "谈判脚本",
        description: "生成谈判目标、底线、备选方案和沟通脚本。",
      },
      {
        name: "条款风险",
        description: "识别交付、质量、付款和违约条款风险。",
      },
    ],
  },
  人力编制规划专家: {
    expertTitle: "组织编制与岗位负荷测算顾问",
    audienceLabel: "适用：HRBP / 组织发展 / 业务负责人",
    businessLine: "办公协同",
    businessLineLabel: "办公协同",
    storeCategory: "roleZone",
    summary: "基于组织目标、岗位负荷和预算约束，辅助 HRBP 形成编制测算与调整建议。",
    scene: "组织编制",
    techShape: "规划型",
    model: "Claude Sonnet 4.6",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "岗位负荷测算",
        description: "按业务量、岗位职责和协作链路估算人员需求。",
      },
      {
        name: "编制方案",
        description: "输出增补、调整、冻结和复用的编制建议。",
      },
      {
        name: "预算约束分析",
        description: "把人力预算和组织目标转成可评审方案。",
      },
    ],
  },
  经营数据洞察专家: {
    expertTitle: "经营指标分析与管理洞察顾问",
    audienceLabel: "适用：经营分析 / 管理层助理 / 业务负责人",
    businessLine: "通用",
    businessLineLabel: "通用",
    storeCategory: "industryExpert",
    summary: "将经营指标、业务事件和异常波动串联分析，形成管理层可读的洞察结论和追问方向。",
    scene: "经营分析",
    techShape: "分析型",
    model: "GPT-4.1",
    runtime: "Frontis 托管Runtime",
    capabilities: [
      {
        name: "指标归因",
        description: "拆解收入、成本、效率和转化指标的变化原因。",
      },
      {
        name: "异常解释",
        description: "结合业务事件解释异常波动并给出验证路径。",
      },
      {
        name: "管理摘要",
        description: "生成面向管理层的结论、风险和下一步建议。",
      },
    ],
  },
};

const getBusinessLineLabel = (line: BusinessLineKey): string =>
  line.trim() || OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;

export const getAgentStoreDomainTone = (line: BusinessLineKey): string =>
  DOMAIN_TONE_MAP[line] ?? DEFAULT_DOMAIN_TONE;

const getSceneCategoryOptions = (
  categories: OperationsAgentPlazaCategoryOption[],
): Array<{ label: string; value: SceneCategoryFilter }> => [
  { label: "全部", value: "all" },
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

const getProductPriceLabel = (product: OperationsProduct): string =>
  product.supportsTrial ? (getProductTrialLabel(product) ?? "免费试用") : "免费使用";

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
    return "添加后立即可用";
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
    return "团队共享";
  }

  return "商店";
};

const getCategoryLabel = (agent: StoreAgentItem): string => agent.businessLineLabel;

const getAgentAvatarSrc = (agent: StoreAgentItem): string =>
  agent.avatarUrl ?? getAvatarUrl(agent.visualSeed);

const getAgentStageLabel = (agent: StoreAgentItem): string => {
  if (agent.sourceType === "frontis") {
    return "平台专家";
  }

  if (agent.sourceType === "teamShare") {
    return "团队共享";
  }

  return "我的专家";
};

const getAgentTools = (agent: StoreAgentItem): AgentToolItem[] => [
  {
    name: "知识库检索",
    description: `按「${agent.scene}」场景读取企业知识库、商品资料和历史任务上下文。`,
    enabled: true,
  },
  {
    name: "文件处理",
    description: "支持上传文档解析、字段抽取、结构化摘要和结果回写。",
    enabled: agent.techShape !== "触发型",
  },
  {
    name: "任务与消息",
    description: "可把处理结果沉淀为待办、通知或团队协作记录。",
    enabled: agent.sourceType !== "frontis" || Boolean(agent.product),
  },
];

const buildAgentEvolutionRecord = (agent: StoreAgentItem): AgentEvolutionRecord => {
  const capabilityNames = agent.capabilities.map(capability => capability.name);
  const primaryCapability = capabilityNames[0] ?? agent.scene;
  const secondaryCapability = capabilityNames[1] ?? agent.businessLineLabel;
  const updateLabel = agent.updatedAt || "最近";

  return {
    curve: [
      { label: "第1周", value: 18 },
      { label: "第2周", value: 28 },
      { label: "第3周", value: 43 },
      { label: "第4周", value: 61 },
      { label: "第5周", value: 76 },
      { label: "第6周", value: 88 },
    ],
    path: [
      {
        title: "身份稳定",
        description: `围绕「${agent.scene}」形成稳定角色边界和响应口径。`,
        status: "done",
      },
      {
        title: "能力沉淀",
        description: `${primaryCapability} 已形成可复用处理策略，覆盖高频任务。`,
        status: "done",
      },
      {
        title: "场景泛化",
        description: `${secondaryCapability} 正在扩展到更多业务样例和异常分支。`,
        status: "active",
      },
      {
        title: "专家闭环",
        description: "持续累积证据、复盘结论和团队反馈，形成可追溯进化记录。",
        status: "locked",
      },
    ],
    evidence: [
      {
        title: `${primaryCapability} 任务复盘`,
        description: `最近一次任务沉淀了「${agent.scene}」场景下的判断规则。`,
        source: `${updateLabel} · MEMORY.md`,
      },
      {
        title: "使用反馈校准",
        description: "根据团队反馈收敛输出边界，减少泛化回答。",
        source: `${updateLabel} · USER.md`,
      },
      {
        title: "核心文件更新",
        description: "身份描述、能力说明和交付格式已同步到核心文件。",
        source: `${updateLabel} · SOUL.md`,
      },
    ],
  };
};

const getAgentEvolutionRecord = (
  agent: StoreAgentItem,
  isAddedToExpertList: boolean,
): AgentEvolutionRecord | null => {
  if (agent.sourceType === "frontis" && (shouldContactForAgent(agent) || !isAddedToExpertList)) {
    return null;
  }

  return buildAgentEvolutionRecord(agent);
};

const getAgentCoreFiles = (agent: StoreAgentItem): AgentCoreFile[] => [
  {
    key: "soulMarkdown",
    name: "SOUL.md",
    description: "定义 AI 专家的身份、目标、边界和工作方式。",
    content: [
      `# ${agent.name}`,
      "",
      `## 名称`,
      agent.name,
      "",
      "## 描述",
      agent.summary,
      "",
      "## 场景",
      `${agent.scene} / ${agent.businessLineLabel}`,
      "",
      "## 工作原则",
      `- 优先围绕「${agent.scene}」完成分析、生成和交付。`,
      "- 输出前校验事实依据、权限范围和结果可执行性。",
    ].join("\n"),
  },
  {
    key: "memoryMarkdown",
    name: "MEMORY.md",
    description: "记录专家需要长期保留的业务上下文和使用偏好。",
    content: [
      `# ${agent.name} Memory`,
      "",
      "## 已知上下文",
      `- 业务线：${agent.businessLineLabel}`,
      `- 可见范围：${agent.scopeLabel}`,
      "",
      "## 能力沉淀",
      ...agent.capabilities.map(capability => `- ${capability.name}：${capability.description}`),
    ].join("\n"),
  },
  {
    key: "userMarkdown",
    name: "USER.md",
    description: "描述使用者输入约束、交互偏好和默认响应格式。",
    content: [
      `# ${agent.name} User Rules`,
      "",
      "## 默认交互",
      "- 先确认任务对象和输出格式，再开始执行。",
      "- 当缺少字段、权限或业务数据时，明确说明缺口。",
      "",
      "## 交付格式",
      `- 默认输出适合「${agent.scene}」的可执行结果。`,
      `- 获取方式：${agent.acquisitionLabel}`,
      `- 交付方式：${agent.deliveryLabel}`,
    ].join("\n"),
  },
];

const getAcquisitionLabel = (product: OperationsProduct): string => {
  if (product.contactMode && product.contactMode !== "disabled") {
    return "联系我们";
  }

  return "添加后在新任务中使用";
};

export const shouldContactForAgent = (agent: StoreAgentItem): boolean =>
  Boolean(agent.product?.contactMode && agent.product.contactMode !== "disabled");

const getContactRemark = (template: string, agentName: string): string =>
  template.trim().replace(/\{agentName\}/g, agentName);

const resolveContactModalInfo = (
  agent: StoreAgentItem,
  serviceContactConfig: OperationsServiceContactConfig,
): ContactModalInfo => {
  const product = agent.product;
  const shouldUseCustomContact =
    product?.contactMode === "custom" && Boolean(product.contactQrCodeValue?.trim());

  if (shouldUseCustomContact && product) {
    return {
      enabled: true,
      contactName: "专属客服",
      qrCodeValue: product.contactQrCodeValue?.trim() ?? "",
      remark: product.contactRemark?.trim() || `扫码后请备注「${agent.name}」。`,
    };
  }

  return {
    enabled: serviceContactConfig.enabled,
    contactName: serviceContactConfig.contactName,
    qrCodeValue: serviceContactConfig.qrCodeValue,
    remark: getContactRemark(serviceContactConfig.remarkTemplate, agent.name),
  };
};

const buildTeamSharedAgents = (
  applicationsByAgentId: Map<string, OperationsAgentSubmission>,
): StoreAgentItem[] =>
  TEAM_SHARED_AGENTS.map(item => ({
    id: item.id,
    sourceType: "teamShare",
    visualSeed: item.id,
    expertTitle: "团队共享",
    audienceLabel: `适用：${item.scene}`,
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
    deliveryLabel: "联系我们开通后可用",
    commodityApplication: applicationsByAgentId.get(item.id) ?? null,
  }));

const mapWorkbenchCategoryToBusinessLine = (
  category: (typeof WORKBENCH_AGENT_STORE_ITEMS)[number]["category"],
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
  WORKBENCH_AGENT_STORE_ITEMS.filter(item => item.id.startsWith("agent-mine-")).map(item => {
    const businessLine = mapWorkbenchCategoryToBusinessLine(item.category);

    return {
      id: item.id,
      sourceType: "mine",
      visualSeed: item.id,
      expertTitle: "个人配置专家",
      audienceLabel: `适用：${item.tags.slice(0, 2).join(" / ") || "个人工作流"}`,
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
          ? "ME Runtime"
          : item.agentType === "openclaw"
            ? "OpenClaw Runtime"
            : "Syngent Runtime",
      submitterLabel: currentUserName,
      scopeLabel: "我开发的 AI专家",
      updatedAt: item.publishTime,
      capabilities: item.skills.map(skill => ({
        name: skill.skillName,
        description: `${skill.skillName} ${skill.version}`,
      })),
      versions: item.versions.map((versionItem, index) => ({
        label: versionItem.version,
        description: versionItem.releaseNote,
        date: versionItem.publishTime,
        current: index === 0,
      })),
      acquisitionLabel: "我开发的 AI专家",
      deliveryLabel: "联系我们开通后可用",
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

export const buildFrontisAgents = (
  products: OperationsProduct[],
  tenantId: string,
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
      const displayName = product.name.trim();
      const blueprintName = product.linkedAgentName?.trim() || displayName;
      const blueprint = FRONTIS_AGENT_BLUEPRINTS[blueprintName];
      const agentName = blueprint?.displayName ?? displayName;
      const productStoreZones = product.storeZones?.length
        ? product.storeZones
        : product.storeZone
          ? [product.storeZone]
          : [blueprint?.storeCategory ?? "industryExpert"];
      const sceneCategoriesByZone = productStoreZones.reduce<Record<string, BusinessLineKey>>(
        (result, zoneId) => {
          result[zoneId] =
            product.plazaCategoryByZone?.[zoneId]?.trim() ||
            product.plazaCategory?.trim() ||
            blueprint?.businessLine ||
            OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;
          return result;
        },
        {},
      );
      const businessLine =
        sceneCategoriesByZone[productStoreZones[0]] ||
        blueprint?.businessLine ||
        OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY;
      const businessLineLabel = getBusinessLineLabel(businessLine);
      const updatedAt = product.updatedAt || "刚刚";

      return {
        id: `frontis-${product.id}`,
        sourceType: "frontis",
        visualSeed: `frontis-${agentName}`,
        avatarUrl: blueprint?.avatarUrl,
        name: agentName,
        expertTitle: blueprint?.expertTitle ?? "企业级 AI 专家",
        audienceLabel: blueprint?.audienceLabel ?? "适用：企业业务团队",
        versionLabel: updatedAt,
        businessLine,
        businessLineLabel,
        storeCategory: productStoreZones[0],
        storeCategories: productStoreZones,
        sceneCategoriesByZone,
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
            description: "添加或试用后自动开通，立即可用。",
          },
        ],
        versions: buildPlatformAgentVersions(product, updatedAt),
        priceLabel: getProductPriceLabel(product),
        trialLabel: getProductTrialLabel(product),
        acquisitionLabel: getAcquisitionLabel(product),
        deliveryLabel: getDeliveryLabel(product.deliveryKind),
        product,
        fulfillment: latestFulfillmentsByProductId.get(product.id) ?? null,
      };
    });

export const resolveLatestFulfillmentsByProductId = (
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

/**
 * AI 专家入口原型页，按菜单拆分为商店与我的专区。
 */
export const ExpertPlazaView = ({
  mode = "store",
  onUseAgent,
}: ExpertPlazaViewProps): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const [teamExpertFilter, setTeamExpertFilter] = useState<TeamExpertFilter>("all");
  const [storeSystemCategory, setStoreSystemCategory] =
    useState<StoreSystemCategoryKey>("roleZone");
  const [storeSceneFilter, setStoreSceneFilter] = useState<SceneCategoryFilter>("all");
  const [teamSceneFilter, setTeamSceneFilter] = useState<SceneCategoryFilter>("all");
  const [products, setProducts] = useState<OperationsProduct[]>(() =>
    loadStoredOperationsProducts(),
  );
  const [fulfillments, setFulfillments] = useState<OperationsFulfillment[]>(() =>
    loadStoredOperationsFulfillments(),
  );
  const [commodityApplications, setCommodityApplications] = useState<OperationsAgentSubmission[]>(
    () => loadEnterpriseCommodityApplications(),
  );
  const [serviceContactConfig, setServiceContactConfig] = useState<OperationsServiceContactConfig>(
    () => loadOperationsServiceContactConfig(),
  );
  const [contactAgent, setContactAgent] = useState<StoreAgentItem | null>(null);
  const [detailAgent, setDetailAgent] = useState<StoreAgentItem | null>(null);
  const [detailTab, setDetailTab] = useState<AgentDetailTab>("identity");
  const [detailFileKey, setDetailFileKey] = useState<AgentCoreFileKey>("soulMarkdown");
  const [removedMineAgentIds, setRemovedMineAgentIds] = useState<Set<string>>(() => new Set());
  const [expertListOverrides, setExpertListOverrides] = useState<Record<string, boolean>>({});
  const [workbenchAgentIds, setWorkbenchAgentIds] = useState<Set<string>>(
    () => new Set(loadWorkbenchAgentRecords().map(record => record.id)),
  );
  const [agentStoreZones, setAgentStoreZones] = useState<OperationsAgentStoreZoneOption[]>(() =>
    loadStoredAgentStoreZones(),
  );
  const [agentPlazaCategories, setAgentPlazaCategories] = useState<
    OperationsAgentPlazaCategoryOption[]
  >(() => loadStoredAgentPlazaCategories());

  const currentTenantId = activeIdentity?.tenantId ?? DEFAULT_TENANT_ID;
  const currentUserName = activeIdentity?.subjectName ?? session?.name ?? "当前用户";
  const tenantSnapshot = useMemo(
    () => getMockTenantManagementSnapshot(currentTenantId),
    [currentTenantId],
  );
  const isTeamEdition = tenantSnapshot?.edition === "team";
  const currentPermissionIds = useMemo(
    () => normalizeTenantRolePermissionIds(activeIdentity?.permissionIds ?? []),
    [activeIdentity?.permissionIds],
  );
  const canManageOwnPublishedAgents =
    isTeamEdition &&
    currentPermissionIds.includes(TENANT_PERMISSION_IDS.develop) &&
    currentPermissionIds.includes(TENANT_PERMISSION_IDS.agentPublishTenant);
  const canApplyForMarketplaceListing =
    canManageOwnPublishedAgents &&
    (tenantSnapshot?.hasAgentListingAccess ||
      currentPermissionIds.includes(TENANT_PERMISSION_IDS.agentPublishMarketplace) ||
      currentPermissionIds.includes(TENANT_PERMISSION_IDS.agentPublishPublic));

  const teamExpertFilterOptions = useMemo(
    () =>
      TEAM_EXPERT_FILTER_OPTIONS.filter(item => {
        if (item.value === "all") {
          return true;
        }

        if (item.value === "mine") {
          return canManageOwnPublishedAgents;
        }

        if (item.value === "teamShare") {
          return isTeamEdition;
        }

        return false;
      }),
    [canManageOwnPublishedAgents, isTeamEdition],
  );

  const sceneCategoryOptions = useMemo(
    () =>
      getSceneCategoryOptions(
        mode === "store"
          ? agentPlazaCategories.filter(category => category.zoneId === storeSystemCategory)
          : agentPlazaCategories,
      ),
    [agentPlazaCategories, mode, storeSystemCategory],
  );
  const storeSystemCategoryOptions = useMemo(
    () =>
      [...agentStoreZones]
        .filter(zone => zone.status === "active")
        .sort((leftItem, rightItem) => {
          if (leftItem.sortOrder !== rightItem.sortOrder) {
            return leftItem.sortOrder - rightItem.sortOrder;
          }

          return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
        })
        .map(zone => ({
          label: zone.name,
          value: zone.id,
        })),
    [agentStoreZones],
  );

  const refreshStorefrontState = useCallback((): void => {
    setProducts(loadStoredOperationsProducts());
    setFulfillments(loadStoredOperationsFulfillments());
    setCommodityApplications(loadEnterpriseCommodityApplications());
    setServiceContactConfig(loadOperationsServiceContactConfig());
    setAgentStoreZones(loadStoredAgentStoreZones());
    setAgentPlazaCategories(loadStoredAgentPlazaCategories());
  }, []);

  useEffect(() => {
    refreshStorefrontState();
  }, [refreshStorefrontState]);

  useEffect(() => {
    const handleWorkbenchAgentsUpdated = (): void => {
      setWorkbenchAgentIds(new Set(loadWorkbenchAgentRecords().map(record => record.id)));
    };

    window.addEventListener(WORKBENCH_AGENT_RECORDS_UPDATED_EVENT, handleWorkbenchAgentsUpdated);

    return () => {
      window.removeEventListener(
        WORKBENCH_AGENT_RECORDS_UPDATED_EVENT,
        handleWorkbenchAgentsUpdated,
      );
    };
  }, []);

  useEffect(() => {
    if (!teamExpertFilterOptions.length) {
      return;
    }

    if (!teamExpertFilterOptions.some(item => item.value === teamExpertFilter)) {
      setTeamExpertFilter(teamExpertFilterOptions[0].value);
    }
  }, [teamExpertFilter, teamExpertFilterOptions]);

  useEffect(() => {
    if (!storeSystemCategoryOptions.length) {
      return;
    }

    if (!storeSystemCategoryOptions.some(item => item.value === storeSystemCategory)) {
      setStoreSystemCategory(storeSystemCategoryOptions[0].value);
    }
  }, [storeSystemCategory, storeSystemCategoryOptions]);

  useEffect(() => {
    if (storeSceneFilter === "all") {
      return;
    }

    const hasCurrentFilter = sceneCategoryOptions.some(item => item.value === storeSceneFilter);

    if (!hasCurrentFilter) {
      setStoreSceneFilter("all");
    }
  }, [sceneCategoryOptions, storeSceneFilter]);

  useEffect(() => {
    if (teamSceneFilter === "all") {
      return;
    }

    const hasCurrentFilter = sceneCategoryOptions.some(item => item.value === teamSceneFilter);

    if (!hasCurrentFilter) {
      setTeamSceneFilter("all");
    }
  }, [sceneCategoryOptions, teamSceneFilter]);

  const commodityApplicationsByAgentId = useMemo(
    () =>
      commodityApplications.reduce<Map<string, OperationsAgentSubmission>>((result, item) => {
        result.set(item.id, item);
        return result;
      }, new Map<string, OperationsAgentSubmission>()),
    [commodityApplications],
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
    () =>
      canManageOwnPublishedAgents
        ? buildMyAgents(currentUserName, commodityApplicationsByAgentId)
        : [],
    [canManageOwnPublishedAgents, commodityApplicationsByAgentId, currentUserName],
  );

  const frontisAgents = useMemo(
    () => buildFrontisAgents(products, currentTenantId, latestFulfillmentsByProductId),
    [currentTenantId, latestFulfillmentsByProductId, products],
  );

  const isInExpertList = useCallback(
    (agent: StoreAgentItem): boolean =>
      expertListOverrides[agent.id] ??
      (Boolean(agent.fulfillment) || workbenchAgentIds.has(agent.id)),
    [expertListOverrides, workbenchAgentIds],
  );

  const purchasedAgents = useMemo(
    () =>
      frontisAgents.filter(
        agent =>
          agent.sourceType === "frontis" && !shouldContactForAgent(agent) && isInExpertList(agent),
      ),
    [frontisAgents, isInExpertList],
  );

  const filteredAgents = useMemo(() => {
    const candidateAgents =
      mode === "store"
        ? frontisAgents
        : isTeamEdition
          ? [...teamSharedAgents, ...purchasedAgents, ...myAgents]
          : [...purchasedAgents, ...myAgents];

    return candidateAgents.filter(agent => {
      if (removedMineAgentIds.has(agent.id)) {
        return false;
      }

      if (mode === "team") {
        if (teamExpertFilter === "all") {
          return teamSceneFilter === "all" || agent.businessLine === teamSceneFilter;
        }

        if (agent.sourceType !== teamExpertFilter) {
          return false;
        }

        return teamSceneFilter === "all" || agent.businessLine === teamSceneFilter;
      }

      if (!(agent.storeCategories ?? [agent.storeCategory]).includes(storeSystemCategory)) {
        return false;
      }

      return (
        storeSceneFilter === "all" ||
        agent.sceneCategoriesByZone?.[storeSystemCategory] === storeSceneFilter ||
        agent.businessLine === storeSceneFilter
      );
    });
  }, [
    frontisAgents,
    isTeamEdition,
    mode,
    myAgents,
    purchasedAgents,
    removedMineAgentIds,
    storeSceneFilter,
    storeSystemCategory,
    teamExpertFilter,
    teamSceneFilter,
    teamSharedAgents,
  ]);

  const contactModalInfo = useMemo<ContactModalInfo | null>(
    () => (contactAgent ? resolveContactModalInfo(contactAgent, serviceContactConfig) : null),
    [contactAgent, serviceContactConfig],
  );
  const detailAgentTools = useMemo(
    () => (detailAgent ? getAgentTools(detailAgent) : []),
    [detailAgent],
  );
  const detailAgentEvolutionRecord = useMemo(
    () => (detailAgent ? getAgentEvolutionRecord(detailAgent, isInExpertList(detailAgent)) : null),
    [detailAgent, isInExpertList],
  );
  const detailAgentCoreFiles = useMemo(
    () => (detailAgent ? getAgentCoreFiles(detailAgent) : []),
    [detailAgent],
  );
  const activeAgentCoreFile = useMemo(
    () => detailAgentCoreFiles.find(file => file.key === detailFileKey) ?? detailAgentCoreFiles[0],
    [detailAgentCoreFiles, detailFileKey],
  );

  const handleContactAgent = useCallback((agent: StoreAgentItem): void => {
    setContactAgent(agent);
  }, []);

  const handleOpenAgentDetail = useCallback((agent: StoreAgentItem): void => {
    setDetailAgent(agent);
    setDetailTab("identity");
    setDetailFileKey("soulMarkdown");
  }, []);

  const handleCloseAgentDetail = useCallback((): void => {
    setDetailAgent(null);
  }, []);

  const handleRemoveMineAgent = useCallback((agent: StoreAgentItem): void => {
    if (agent.sourceType !== "mine") {
      return;
    }

    setRemovedMineAgentIds(current => new Set([...current, agent.id]));
    message.success("已从我的专区删除该 AI 专家。");
  }, []);

  const handleAddToWorkbench = useCallback((agent: StoreAgentItem): void => {
    const nextRecords = upsertWorkbenchAgentRecord({
      id: agent.id,
      name: agent.name,
      avatarUrl: agent.avatarUrl,
      visualSeed: agent.visualSeed,
      role: `${agent.scene} · ${agent.techShape}`,
      model: agent.model,
      summary: agent.summary,
      developerName: agent.submitterLabel,
      agentId: agent.product?.linkedAgentId || agent.id,
      runtimeAgentId: `rt-${agent.id}`,
      skills: agent.capabilities.map(item => item.name),
    });

    setWorkbenchAgentIds(new Set(nextRecords.map(record => record.id)));
    if (agent.sourceType === "frontis") {
      setExpertListOverrides(current => ({ ...current, [agent.id]: true }));
    }
    message.success(`已免费使用「${agent.name}」，可单聊，也可由 ME 调度。`);
  }, []);

  const handleUseAgent = useCallback(
    (agent: StoreAgentItem): void => {
      if (onUseAgent) {
        onUseAgent(agent.id);
        return;
      }

      message.success(`已进入「${agent.name}」使用入口。`);
    },
    [onUseAgent],
  );

  const handleApplyForMarketplaceListing = useCallback((agent: StoreAgentItem): void => {
    message.success(`已提交「${agent.name}」上架申请。`);
  }, []);

  const renderExpertListAction = (agent: StoreAgentItem): JSX.Element => {
    const isInWorkbench = workbenchAgentIds.has(agent.id);

    if (isInWorkbench) {
      return (
        <Button
          className={`${styles.cardActionButton} ${styles.cardActionButtonPrimary}`}
          icon={<ArrowRightOutlined />}
          onClick={() => handleUseAgent(agent)}
      >
        去使用
      </Button>
      );
    }

    return (
      <Button
        className={styles.cardActionButton}
        icon={<UserAddOutlined />}
        onClick={() => handleAddToWorkbench(agent)}
      >
        免费使用
      </Button>
    );
  };

  const renderAgentActions = (agent: StoreAgentItem): JSX.Element => {
    const shouldContact = agent.sourceType === "frontis" && shouldContactForAgent(agent);

    if (shouldContact) {
      return (
        <Tooltip title="联系我们">
          <Button
            aria-label="联系我们"
            className={`${styles.cardIconButton} ${styles.cardIconButtonPrimary}`}
            icon={<CustomerServiceOutlined />}
            onClick={() => handleContactAgent(agent)}
          />
        </Tooltip>
      );
    }

    return (
      <>
        {agent.sourceType === "mine" ? (
          <Popconfirm
            title="删除 AI 专家"
            description="删除后，该 AI 专家将不再显示在我的专区。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemoveMineAgent(agent)}
          >
            <Tooltip title="删除">
              <Button
                aria-label="删除"
                className={styles.cardIconButton}
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        ) : null}
        {renderExpertListAction(agent)}
        {agent.sourceType === "mine" && canApplyForMarketplaceListing ? (
          <Tooltip title="申请上架">
            <Button
              aria-label="申请上架"
              className={styles.cardIconButton}
              icon={<UploadOutlined />}
              onClick={() => handleApplyForMarketplaceListing(agent)}
            />
          </Tooltip>
        ) : null}
      </>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbarCard}>
        <div className={styles.filterGroup}>
          {mode === "team" ? (
            <div className={styles.filterTabRow} role="tablist" aria-label="我的专区专家分类">
              {teamExpertFilterOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={teamExpertFilter === option.value && teamSceneFilter === "all"}
                  className={classNames(
                    styles.filterTabButton,
                    teamExpertFilter === option.value &&
                      teamSceneFilter === "all" &&
                      styles.filterTabButtonActive,
                  )}
                  onClick={() => {
                    setTeamExpertFilter(option.value);
                    setTeamSceneFilter("all");
                  }}
                >
                  {option.label}
                </button>
              ))}
              {sceneCategoryOptions
                .filter(option => option.value !== "all")
                .map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={teamExpertFilter === "all" && teamSceneFilter === option.value}
                    className={classNames(
                      styles.filterTabButton,
                      teamExpertFilter === "all" &&
                        teamSceneFilter === option.value &&
                        styles.filterTabButtonActive,
                    )}
                    onClick={() => {
                      setTeamExpertFilter("all");
                      setTeamSceneFilter(option.value);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
            </div>
          ) : (
            <>
              <div className={styles.filterTabRow} role="tablist" aria-label="商店系统分类">
                {storeSystemCategoryOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={storeSystemCategory === option.value}
                    className={classNames(
                      styles.filterTabButton,
                      storeSystemCategory === option.value && styles.filterTabButtonActive,
                    )}
                    onClick={() => setStoreSystemCategory(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className={styles.filterTabRow} role="tablist" aria-label="商店场景分类">
                {sceneCategoryOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={storeSceneFilter === option.value}
                    className={classNames(
                      styles.filterTabButton,
                      storeSceneFilter === option.value && styles.filterTabButtonActive,
                    )}
                    onClick={() => setStoreSceneFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.agentGrid}>
        {filteredAgents.map(agent => (
          <article
            key={agent.id}
            className={styles.agentCard}
            role="button"
            tabIndex={0}
            onClick={() => handleOpenAgentDetail(agent)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                handleOpenAgentDetail(agent);
              }
            }}
          >
            <header className={styles.cardHeader}>
              <div className={styles.agentAvatar}>
                <img alt={agent.name} src={getAgentAvatarSrc(agent)} />
              </div>
              <div className={styles.cardTitleBlock}>
                <h3 className={styles.cardTitle}>{agent.name}</h3>
                <span className={styles.cardExpertTitle}>{agent.expertTitle}</span>
                <p className={styles.agentDescription}>{agent.summary}</p>
              </div>
            </header>

            <div className={styles.agentCapabilityStrip} aria-label="核心技能">
              <span className={styles.capabilityLabel}>专长</span>
              {agent.capabilities.slice(0, 3).map(capability => (
                <span key={`${agent.id}-${capability.name}`}>{capability.name}</span>
              ))}
            </div>

            <div
              className={styles.cardFooter}
              onClick={event => event.stopPropagation()}
              onKeyDown={event => event.stopPropagation()}
            >
              {renderAgentActions(agent)}
            </div>
          </article>
        ))}
      </div>

      {!filteredAgents.length ? (
        <div className={styles.emptyState}>
          {mode === "store" ? "当前分类下暂无可添加的 AI 专家。" : "当前分类下暂无我的专区。"}
        </div>
      ) : null}

      <Modal
        open={Boolean(contactAgent)}
        title={contactAgent ? `联系「${contactAgent.name}」` : "联系客服"}
        footer={
          <Button type="primary" onClick={() => setContactAgent(null)}>
            我知道了
          </Button>
        }
        centered
        destroyOnHidden
        onCancel={() => setContactAgent(null)}
      >
        {contactModalInfo?.enabled && contactModalInfo.qrCodeValue.trim() ? (
          <div className={styles.contactModalBody}>
            <div className={styles.contactQrPanel}>
              <QRCode value={contactModalInfo.qrCodeValue.trim()} size={184} bordered={false} />
            </div>
            <div className={styles.contactInfoBlock}>
              <div className={styles.contactName}>{contactModalInfo.contactName}</div>
              <p className={styles.contactRemark}>{contactModalInfo.remark}</p>
            </div>
          </div>
        ) : (
          <div className={styles.contactEmptyState}>
            <Empty description="运营后台暂未启用客服二维码" />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(detailAgent)}
        title={null}
        footer={null}
        width={1120}
        centered
        destroyOnHidden
        className={styles.agentDetailModal}
        onCancel={handleCloseAgentDetail}
      >
        {detailAgent ? (
          <div className={styles.agentDetailPanel}>
            <div className={styles.agentDetailBody}>
              <aside className={styles.agentDetailNav} role="tablist" aria-label="AI专家详情">
                {[
                  { key: "identity", label: "身份", icon: <UserOutlined /> },
                  { key: "tools", label: "工具", icon: <SlidersOutlined /> },
                  { key: "skills", label: "技能", count: detailAgent.capabilities.length },
                  { key: "growth", label: "进化", icon: <ProfileOutlined /> },
                  { key: "files", label: "核心文件", icon: <FileTextOutlined /> },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === item.key}
                    className={detailTab === item.key ? styles.agentDetailNavActive : ""}
                    onClick={() => setDetailTab(item.key as AgentDetailTab)}
                  >
                    {"icon" in item ? item.icon : <ProfileOutlined />}
                    <span>{item.label}</span>
                    {item.count ? <em>{item.count}</em> : null}
                  </button>
                ))}
              </aside>

              <section className={styles.agentDetailContent}>
                {detailTab === "identity" ? (
                  detailAgent.sourceType === "mine" ? (
                    <div className={styles.agentIdentityPane}>
                      <div className={styles.agentIdentityForm}>
                        <label className={styles.agentDetailField}>
                          <span>
                            名称 <b>*</b>
                          </span>
                          <div>{detailAgent.name}</div>
                        </label>

                        <label className={styles.agentDetailField}>
                          <span>
                            卡片简述 <b>*</b>
                          </span>
                          <p>{detailAgent.summary}</p>
                        </label>

                        <div className={styles.agentAvatarEditor}>
                          <div className={styles.agentDetailSectionTitle}>头像</div>
                          <div className={styles.agentAvatarLine}>
                            <div className={styles.agentAvatarLarge}>
                              <img alt={detailAgent.name} src={getAgentAvatarSrc(detailAgent)} />
                            </div>
                            <div className={styles.agentAvatarMeta}>
                              <strong>我的专家</strong>
                              <span>支持 PNG、JPG、WebP，最大 2MB</span>
                            </div>
                          </div>
                        </div>

                        <section className={styles.agentDetailBlock}>
                          <h3>基础信息</h3>
                          <dl className={styles.agentInfoGrid}>
                            <div>
                              <dt>场景</dt>
                              <dd>{detailAgent.scene}</dd>
                            </div>
                            <div>
                              <dt>可见范围</dt>
                              <dd>{detailAgent.scopeLabel}</dd>
                            </div>
                            <div>
                              <dt>业务线</dt>
                              <dd>{detailAgent.businessLineLabel}</dd>
                            </div>
                            <div>
                              <dt>最近更新</dt>
                              <dd>{detailAgent.updatedAt}</dd>
                            </div>
                          </dl>
                        </section>
                      </div>

                      <aside className={styles.agentDetailPreview}>
                        <div className={styles.agentPreviewCard}>
                          <div
                            className={styles.agentPreviewCover}
                            style={{
                              background: getAgentStoreDomainTone(detailAgent.businessLine),
                            }}
                          />
                          <div className={styles.agentPreviewAvatar}>
                            <img alt={detailAgent.name} src={getAgentAvatarSrc(detailAgent)} />
                          </div>
                          <h3>{detailAgent.name}</h3>
                          <p>{detailAgent.summary}</p>
                        </div>
                      </aside>
                    </div>
                  ) : (
                    <div className={styles.agentReadOnlyProfile}>
                      <section className={styles.agentReadOnlyHero}>
                        <div className={styles.agentReadOnlyAvatar}>
                          <img alt={detailAgent.name} src={getAgentAvatarSrc(detailAgent)} />
                        </div>
                        <div>
                          <h3>{detailAgent.name}</h3>
                          <p>{detailAgent.summary}</p>
                        </div>
                      </section>

                      <section className={styles.agentReadOnlyBlock}>
                        <h3>专家能力</h3>
                        <div className={styles.agentReadOnlyCapabilities}>
                          {detailAgent.capabilities.map(capability => (
                            <article key={capability.name}>
                              <strong>{capability.name}</strong>
                              <span>{capability.description}</span>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className={styles.agentReadOnlyBlock}>
                        <h3>使用指南</h3>
                        <p>{detailAgent.audienceLabel.replace(/^适用：/, "")}</p>
                      </section>
                    </div>
                  )
                ) : detailTab === "tools" ? (
                  <div className={styles.agentDetailList}>
                    <div className={styles.agentDetailSectionHead}>
                      <h3>工具</h3>
                      <p>当前「{detailAgent.name}」可用工具</p>
                    </div>
                    {detailAgentTools.map(tool => (
                      <article key={tool.name} className={styles.agentToolItem}>
                        <div className={styles.agentToolIcon}>
                          <SlidersOutlined />
                        </div>
                        <div>
                          <strong>{tool.name}</strong>
                          <span>{tool.description}</span>
                        </div>
                        <b>{tool.enabled ? "可用" : "不可用"}</b>
                      </article>
                    ))}
                  </div>
                ) : detailTab === "skills" ? (
                  <div className={styles.agentDetailList}>
                    <div className={styles.agentDetailSectionHead}>
                      <h3>{detailAgent.capabilities.length} skills</h3>
                      <p>当前「{detailAgent.name}」已安装技能</p>
                    </div>
                    {detailAgent.capabilities.map(capability => (
                      <article key={capability.name} className={styles.agentSkillItem}>
                        <div className={styles.agentSkillIcon}>{capability.name.slice(0, 1)}</div>
                        <div>
                          <strong>{capability.name}</strong>
                          <span>{capability.description}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : detailTab === "growth" ? (
                  detailAgentEvolutionRecord ? (
                    <div className={styles.agentEvolutionPane}>
                      <section className={styles.agentEvolutionCurve}>
                        <div className={styles.agentDetailSectionHead}>
                          <h3>进化曲线</h3>
                          <p>基于任务沉淀、反馈校准和核心文件更新形成的阶段变化</p>
                        </div>
                        <div className={styles.evolutionChart} aria-label="进化曲线">
                          <svg viewBox="0 0 360 140" role="img">
                            <polyline points="16,102 82,90 148,72 214,51 280,33 344,18" />
                            {detailAgentEvolutionRecord.curve.map((point, index) => (
                              <circle
                                key={point.label}
                                cx={16 + index * 66}
                                cy={124 - point.value * 1.2}
                                r="4"
                              />
                            ))}
                          </svg>
                        </div>
                        <div className={styles.evolutionCurveLegend}>
                          {detailAgentEvolutionRecord.curve.map(point => (
                            <span key={point.label}>
                              <b>{point.label}</b>
                              {point.value}
                            </span>
                          ))}
                        </div>
                      </section>

                      <section className={styles.agentEvolutionBlock}>
                        <div className={styles.agentDetailSectionHead}>
                          <h3>进化路径</h3>
                          <p>从身份稳定到专家闭环的关键节点</p>
                        </div>
                        <div className={styles.evolutionPathList}>
                          {detailAgentEvolutionRecord.path.map(item => (
                            <article
                              key={item.title}
                              className={classNames(
                                styles.evolutionPathItem,
                                item.status === "active" && styles.evolutionPathItemActive,
                                item.status === "locked" && styles.evolutionPathItemLocked,
                              )}
                            >
                              <CheckCircleOutlined />
                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.description}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className={styles.agentEvolutionBlock}>
                        <div className={styles.agentDetailSectionHead}>
                          <h3>进化证据</h3>
                          <p>来自核心文件、任务复盘和团队反馈的可追溯记录</p>
                        </div>
                        <div className={styles.evolutionEvidenceGrid}>
                          {detailAgentEvolutionRecord.evidence.map(item => (
                            <article key={item.title} className={styles.evolutionEvidenceItem}>
                              <LineChartOutlined />
                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.description}</span>
                                <em>{item.source}</em>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className={styles.agentEvolutionEmpty}>
                      <ProfileOutlined />
                      <strong>暂无进化记录</strong>
                    </div>
                  )
                ) : (
                  <div className={styles.agentFilesPane}>
                    <div className={styles.agentFileTabs}>
                      {detailAgentCoreFiles.map(file => (
                        <button
                          key={file.key}
                          type="button"
                          className={detailFileKey === file.key ? styles.agentFileTabActive : ""}
                          onClick={() => setDetailFileKey(file.key)}
                        >
                          {file.name}
                        </button>
                      ))}
                    </div>
                    {activeAgentCoreFile ? (
                      <article className={styles.agentFileViewer}>
                        <header>
                          <div>
                            <h3>{activeAgentCoreFile.name}</h3>
                            <p>{activeAgentCoreFile.description}</p>
                          </div>
                        </header>
                        <pre>{activeAgentCoreFile.content}</pre>
                      </article>
                    ) : null}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
