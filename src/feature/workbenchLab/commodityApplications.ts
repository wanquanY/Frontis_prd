import type { OperationsAgentSubmission } from "@/feature/operations/types";

const DEFAULT_ENTERPRISE_COMMODITY_APPLICATIONS: OperationsAgentSubmission[] = [
  {
    id: "agent-mine-001__v1-1-0",
    sourceAgentId: "agent-mine-001",
    applicationKind: "initialListing",
    name: "合同风控 Agent",
    version: "1.1.0",
    submitter: "陈蓝",
    submittedAt: "2026-02-26 16:20",
    status: "approved",
    description:
      "合同全生命周期风控 Agent，自动审核条款、对比历史合同、标注风险点并生成合规建议。",
    usageGuide:
      "上传或粘贴合同文本、历史合同和审核标准，说明需要关注的风险类型；专家会输出风险条款、修改建议和需人工确认事项。",
    sceneTags: ["法务", "风控"],
    submitReason: "该 AI 专家已在企业内部法务场景稳定使用，申请上架到专家广场供更多租户复用。",
    currentScopeLabel: "已发布到专家广场",
    lastReviewedAt: "2026-02-27 10:05",
    plazaCategory: "通用",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "online",
    plazaUpdatedAt: "2026-02-27 10:20",
    skills: [
      {
        id: "agent-mine-001-skill-1",
        name: "合同审核流程",
        typeLabel: "专家技能",
        description: "提取合同关键条款并识别付款、违约、责任边界等风险点。",
      },
      {
        id: "agent-mine-001-skill-2",
        name: "知识库问答",
        typeLabel: "专家技能",
        description: "结合企业合同制度和历史问答输出可追溯的审核建议。",
      },
    ],
    coreFiles: [
      {
        id: "agent-mine-001-soul",
        name: "SOUL.md",
        fileType: "身份与边界",
        updatedAt: "2026-02-27 10:20",
        description: "定义 AI 专家的身份、目标、边界和工作方式。",
        content: [
          "# 合同风控 Agent",
          "",
          "## 描述",
          "合同全生命周期风控 Agent，自动审核条款、对比历史合同、标注风险点并生成合规建议。",
          "",
          "## 使用边界",
          "- 提供合同审核辅助建议，不替代法务最终判断。",
          "- 对缺少合同文本、审核标准或权限的数据明确提示缺口。",
        ].join("\n"),
      },
      {
        id: "agent-mine-001-user",
        name: "USER.md",
        fileType: "交互约束",
        updatedAt: "2026-02-27 10:20",
        description: "描述使用者输入约束、交互偏好和默认输出格式。",
        content: [
          "# USER.md",
          "",
          "- 使用者需要提供合同文本、合同类型和重点关注条款。",
          "- 默认输出风险等级、风险说明、修改建议和人工复核点。",
        ].join("\n"),
      },
    ],
  },
];

/**
 * 企业员工提交商品化申请在本地原型中的持久化 key。
 */
export const ENTERPRISE_COMMODITY_APPLICATION_STORAGE_KEY =
  "frontis.enterprise.commodity.applications";

const isEnterpriseCommodityApplication = (
  item: unknown,
): item is OperationsAgentSubmission =>
  typeof item === "object" &&
  item !== null &&
  "id" in item &&
  "name" in item &&
  "status" in item &&
  "submittedAt" in item;

const mergeEnterpriseCommodityApplications = (
  storedApplications: OperationsAgentSubmission[],
): OperationsAgentSubmission[] => {
  const applicationMap = new Map<string, OperationsAgentSubmission>();

  DEFAULT_ENTERPRISE_COMMODITY_APPLICATIONS.forEach(item => {
    applicationMap.set(item.id, item);
  });

  storedApplications.forEach(item => {
    applicationMap.set(item.id, item);
  });

  return Array.from(applicationMap.values()).sort((leftItem, rightItem) =>
    rightItem.submittedAt.localeCompare(leftItem.submittedAt),
  );
};

/**
 * 从本地存储读取商品化申请。
 */
export const loadEnterpriseCommodityApplications =
  (): OperationsAgentSubmission[] => {
    if (typeof window === "undefined") {
      return DEFAULT_ENTERPRISE_COMMODITY_APPLICATIONS;
    }

    try {
      const rawValue = window.localStorage.getItem(
        ENTERPRISE_COMMODITY_APPLICATION_STORAGE_KEY,
      );

      if (!rawValue) {
        return DEFAULT_ENTERPRISE_COMMODITY_APPLICATIONS;
      }

      const parsedValue = JSON.parse(rawValue) as unknown;

      if (!Array.isArray(parsedValue)) {
        return DEFAULT_ENTERPRISE_COMMODITY_APPLICATIONS;
      }

      return mergeEnterpriseCommodityApplications(
        parsedValue.filter(isEnterpriseCommodityApplication),
      );
    } catch {
      return DEFAULT_ENTERPRISE_COMMODITY_APPLICATIONS;
    }
  };

/**
 * 将商品化申请写入本地存储。
 */
export const saveEnterpriseCommodityApplications = (
  applications: OperationsAgentSubmission[],
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ENTERPRISE_COMMODITY_APPLICATION_STORAGE_KEY,
    JSON.stringify(applications),
  );
};
