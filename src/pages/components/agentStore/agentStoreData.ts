import type { OwnedExpertTeam, RecommendedExpertTeam } from "./types";

/**
 * 已购 AI 专家团 mock 数据。
 */
export const OWNED_EXPERT_TEAMS: OwnedExpertTeam[] = [
  {
    id: "team-product",
    name: "产研协作专家团",
    icon: "🧠",
    category: "产品研发",
    categoryColor: "#2563eb",
    description: "产品策略、交互设计、资料研究、上线协调，端到端覆盖产研全流程",
    memberIds: ["employee-pm", "employee-designer", "employee-research", "employee-ops"],
    subAgentTags: ["产品策略官", "交互设计师", "资料研究员", "上线协调员"],
    version: "v2.1",
    hasNewVersion: true,
    newVersion: "v2.2",
    updateNotes: ["新增智能配色功能", "支持更多模板风格", "修复已知问题"],
    cumulativeTaskCount: 1280,
    workspaceId: "workspace-cloud",
  },
  {
    id: "team-sales",
    name: "销售增长专家团",
    icon: "📈",
    category: "销售运营",
    categoryColor: "#16a34a",
    description: "销售战报、内容创作、本地市场跟进，加速一线业务推进",
    memberIds: ["employee-writer", "employee-sales"],
    subAgentTags: ["本地内容助理", "销售战报助手"],
    version: "v1.5",
    hasNewVersion: false,
    cumulativeTaskCount: 450,
    workspaceId: "workspace-local",
  },
];

/**
 * 推荐 AI 专家团 mock 数据。
 */
export const RECOMMENDED_EXPERT_TEAMS: RecommendedExpertTeam[] = [
  {
    id: "rec-legal",
    name: "AI法务合同审查专家团",
    icon: "🏛",
    category: "财务法务",
    categoryColor: "#d97706",
    description: "合同风险识别、条款比对、法律意见生成，大幅降低法务成本",
    price: 19800,
    recommendation: "基于您公司的业务场景推荐",
    detailSlug: "finance-reconciliation-officer",
  },
  {
    id: "rec-service",
    name: "AI客服智能应答专家团",
    icon: "🎯",
    category: "商机管理",
    categoryColor: "#2563eb",
    description: "7×24小时智能客服，自动处理常见问题，支持多轮对话",
    price: 29800,
    recommendation: "可与现有销售助手协同工作",
    detailSlug: "service-quality-officer",
  },
  {
    id: "rec-data",
    name: "AI数据分析专家团",
    icon: "📊",
    category: "财务法务",
    categoryColor: "#d97706",
    description: "多维度数据可视化、自动报表生成、异常预警通知",
    price: 24800,
    recommendation: "与财务分析专家团形成完整闭环",
    detailSlug: "operations-dashboard-officer",
  },
];
