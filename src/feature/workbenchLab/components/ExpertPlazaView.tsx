import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Empty, Modal, Popconfirm, QRCode, message } from "antd";
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
import { loadStoredAgentPlazaCategories } from "@/feature/operations/agentPlazaCategoryStorage";
import { OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY } from "@/feature/operations/mockData";
import {
  TENANT_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentSubmission,
  OperationsFulfillment,
  OperationsProduct,
  OperationsProductDeliveryKind,
  OperationsServiceContactConfig,
} from "@/feature/operations/types";
import { getAvatarUrl } from "@/pages/utils";

import styles from "./ExpertPlazaView.module.less";

type TeamExpertFilter = "teamShare" | "mine";
type StoreSystemCategoryKey = "roleZone" | "industryExpert";
type SceneCategoryFilter = "all" | BusinessLineKey;
export type BusinessLineKey = OperationsAgentPlazaCategoryOption["name"];
type AgentSourceType = "mine" | "teamShare" | "frontis";
type ExpertPlazaMode = "store" | "team";

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
  name: string;
  versionLabel: string;
  businessLine: BusinessLineKey;
  businessLineLabel: string;
  storeCategory?: StoreSystemCategoryKey;
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
  { label: "团队共享", value: "teamShare" },
  { label: "我的", value: "mine" },
];

const STORE_SYSTEM_CATEGORY_OPTIONS: Array<{ label: string; value: StoreSystemCategoryKey }> = [
  { label: "角色专区", value: "roleZone" },
  { label: "行业专家", value: "industryExpert" },
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
    storeCategory: "roleZone",
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
    storeCategory: "industryExpert",
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
    storeCategory: "roleZone",
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
  product.supportsTrial ? (getProductTrialLabel(product) ?? "免费试用") : "免费添加";

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

const getCategoryLabel = (agent: StoreAgentItem): string => {
  const systemCategory = STORE_SYSTEM_CATEGORY_OPTIONS.find(
    option => option.value === agent.storeCategory,
  );

  return systemCategory?.label ?? agent.businessLineLabel;
};

const getAcquisitionLabel = (product: OperationsProduct): string => {
  if (product.contactMode && product.contactMode !== "disabled") {
    return "联系我们";
  }

  return "添加到专家列表";
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
        storeCategory: blueprint?.storeCategory ?? "industryExpert",
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
 * AI 专家入口原型页，按菜单拆分为商店与团队资产。
 */
export const ExpertPlazaView = ({ mode = "store" }: ExpertPlazaViewProps): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const [teamExpertFilter, setTeamExpertFilter] = useState<TeamExpertFilter>("teamShare");
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
  const [removedMineAgentIds, setRemovedMineAgentIds] = useState<Set<string>>(() => new Set());
  const [expertListOverrides, setExpertListOverrides] = useState<Record<string, boolean>>({});
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
    () => getSceneCategoryOptions(agentPlazaCategories),
    [agentPlazaCategories],
  );

  const refreshStorefrontState = useCallback((): void => {
    setProducts(loadStoredOperationsProducts());
    setFulfillments(loadStoredOperationsFulfillments());
    setCommodityApplications(loadEnterpriseCommodityApplications());
    setServiceContactConfig(loadOperationsServiceContactConfig());
    setAgentPlazaCategories(loadStoredAgentPlazaCategories());
  }, []);

  useEffect(() => {
    refreshStorefrontState();
  }, [refreshStorefrontState]);

  useEffect(() => {
    if (!teamExpertFilterOptions.length) {
      return;
    }

    if (!teamExpertFilterOptions.some(item => item.value === teamExpertFilter)) {
      setTeamExpertFilter(teamExpertFilterOptions[0].value);
    }
  }, [teamExpertFilter, teamExpertFilterOptions]);

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

  const filteredAgents = useMemo(() => {
    const candidateAgents =
      mode === "store"
        ? frontisAgents
        : isTeamEdition
          ? [...teamSharedAgents, ...myAgents]
          : myAgents;

    return candidateAgents.filter(agent => {
      if (removedMineAgentIds.has(agent.id)) {
        return false;
      }

      if (mode === "team") {
        if (agent.sourceType !== teamExpertFilter) {
          return false;
        }

        return teamSceneFilter === "all" || agent.businessLine === teamSceneFilter;
      }

      if (agent.storeCategory !== storeSystemCategory) {
        return false;
      }

      return storeSceneFilter === "all" || agent.businessLine === storeSceneFilter;
    });
  }, [
    frontisAgents,
    isTeamEdition,
    mode,
    myAgents,
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

  const handleContactAgent = useCallback((agent: StoreAgentItem): void => {
    setContactAgent(agent);
  }, []);

  const handleRemoveMineAgent = useCallback((agent: StoreAgentItem): void => {
    if (agent.sourceType !== "mine") {
      return;
    }

    setRemovedMineAgentIds(current => new Set([...current, agent.id]));
    message.success("已从团队资产删除该 AI 专家。");
  }, []);

  const isInExpertList = useCallback(
    (agent: StoreAgentItem): boolean => expertListOverrides[agent.id] ?? Boolean(agent.fulfillment),
    [expertListOverrides],
  );

  const handleAddToExpertList = useCallback((agent: StoreAgentItem): void => {
    setExpertListOverrides(current => ({ ...current, [agent.id]: true }));
    message.success(`已添加「${agent.name}」到专家列表。`);
  }, []);

  const handleRemoveFromExpertList = useCallback((agent: StoreAgentItem): void => {
    setExpertListOverrides(current => ({ ...current, [agent.id]: false }));
    message.success(`已从专家列表移除「${agent.name}」。`);
  }, []);

  const handleApplyForMarketplaceListing = useCallback((agent: StoreAgentItem): void => {
    message.success(`已提交「${agent.name}」上架申请。`);
  }, []);

  const renderExpertListAction = (agent: StoreAgentItem): JSX.Element => {
    const isAddedToExpertList = isInExpertList(agent);

    return (
      <Button
        className={`${styles.cardActionButton} ${styles.cardActionButtonPrimary}`}
        onClick={() =>
          isAddedToExpertList ? handleRemoveFromExpertList(agent) : handleAddToExpertList(agent)
        }
      >
        {isAddedToExpertList ? "从专家列表移除" : "添加到专家列表"}
      </Button>
    );
  };

  const renderAgentActions = (agent: StoreAgentItem): JSX.Element => {
    const shouldContact = agent.sourceType === "frontis" && shouldContactForAgent(agent);

    if (shouldContact) {
      return (
        <>
          <Button
            className={`${styles.cardActionButton} ${styles.cardActionButtonPrimary}`}
            onClick={() => handleContactAgent(agent)}
          >
            联系我们
          </Button>
        </>
      );
    }

    return (
      <>
        {agent.sourceType === "mine" ? (
          <Popconfirm
            title="删除 AI 专家"
            description="删除后，该 AI 专家将不再显示在团队资产。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemoveMineAgent(agent)}
          >
            <Button className={styles.cardActionButton}>删除</Button>
          </Popconfirm>
        ) : null}
        {renderExpertListAction(agent)}
        {agent.sourceType === "mine" && canApplyForMarketplaceListing ? (
          <Button
            className={styles.cardActionButton}
            onClick={() => handleApplyForMarketplaceListing(agent)}
          >
            申请上架
          </Button>
        ) : null}
      </>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbarCard}>
        <div className={styles.filterGroup}>
          {mode === "team" ? (
            <>
              <div className={styles.filterTabRow} role="tablist" aria-label="团队专家分类">
                {teamExpertFilterOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={teamExpertFilter === option.value}
                    className={classNames(
                      styles.filterTabButton,
                      teamExpertFilter === option.value && styles.filterTabButtonActive,
                    )}
                    onClick={() => setTeamExpertFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className={styles.filterTabRow} role="tablist" aria-label="团队专家场景分类">
                {sceneCategoryOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={teamSceneFilter === option.value}
                    className={classNames(
                      styles.filterTabButton,
                      teamSceneFilter === option.value && styles.filterTabButtonActive,
                    )}
                    onClick={() => setTeamSceneFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={styles.filterTabRow} role="tablist" aria-label="商店系统分类">
                {STORE_SYSTEM_CATEGORY_OPTIONS.map(option => (
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
          <article key={agent.id} className={styles.agentCard}>
            <div className={styles.cardContent}>
              <div
                className={styles.visualPanel}
                style={{ background: getAgentStoreDomainTone(agent.businessLine) }}
              >
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
                </div>

                <div className={styles.badgeRow}>
                  <span className={`${styles.miniBadge} ${styles.sourceBadge}`}>
                    {getVisibilityLabel(agent)}
                  </span>
                  <span className={`${styles.miniBadge} ${styles.domainBadge}`}>
                    {mode === "store" ? getCategoryLabel(agent) : agent.businessLineLabel}
                  </span>
                </div>

                <p className={styles.agentDescription}>{agent.summary}</p>
              </div>
            </div>

            <div className={styles.cardFooter}>{renderAgentActions(agent)}</div>
          </article>
        ))}
      </div>

      {!filteredAgents.length ? (
        <div className={styles.emptyState}>
          {mode === "store" ? "当前分类下暂无可添加的 AI 专家。" : "当前分类下暂无团队资产。"}
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
    </div>
  );
};
