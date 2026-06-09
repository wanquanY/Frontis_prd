export interface WorkbenchAgentRecord {
  id: string;
  installSource?: "expertPlazaProduct" | "enterpriseAgent";
  productId?: string;
  enterpriseAgentId?: string;
  agentReleaseId?: string;
  name: string;
  avatarUrl?: string;
  visualSeed: string;
  role: string;
  model: string;
  summary: string;
  developerName?: string;
  agentId: string;
  runtimeAgentId: string;
  skills: string[];
}

const DEFAULT_WORKBENCH_AGENT_RECORDS: WorkbenchAgentRecord[] = [
  {
    id: "team-shared-sales-script",
    name: "销售话术助手",
    visualSeed: "team-shared-sales-script",
    role: "Aiden · 销售沟通教练",
    model: "Claude Sonnet 4.6",
    summary:
      "Aiden，资深销售顾问出身的客户沟通教练。长期陪跑一线销售团队，擅长把客户画像、异议记录和历史对话翻译成下一轮可直接开口的话术，帮你在预算、价值和决策风险之间找到更稳的推进方式。",
    developerName: "销售团队",
    agentId: "team-shared-sales-script",
    runtimeAgentId: "rt-team-shared-sales-script",
    skills: ["客户意图识别", "话术生成", "历史对话召回"],
  },
  {
    id: "team-shared-opportunity",
    name: "商机跟进提醒",
    visualSeed: "team-shared-opportunity",
    role: "Mira · 商机节奏教练",
    model: "Claude Sonnet 4.6",
    summary:
      "Mira，客户成功体系出身的商机节奏教练。熟悉销售漏斗和客户成功协作节奏，会盯住每个商机的停留时长、关键联系人和下一步动作，在机会变冷前提醒你补材料、换触点或升级协同。",
    developerName: "销售运营团队",
    agentId: "team-shared-opportunity",
    runtimeAgentId: "rt-team-shared-opportunity",
    skills: ["商机时效监控", "跟进行动建议"],
  },
  {
    id: "team-shared-delivery",
    name: "项目交付助手",
    visualSeed: "team-shared-delivery",
    role: "Ethan · 项目风险教练",
    model: "GPT-4.1",
    summary:
      "Ethan，交付 PMO 出身的项目风险教练。具备 PMO 式的交付视角，习惯从里程碑、资源占用和客户确认链路里提前发现风险，帮项目负责人把周报、阻塞项和下一步责任人说清楚。",
    developerName: "交付管理团队",
    agentId: "team-shared-delivery",
    runtimeAgentId: "rt-team-shared-delivery",
    skills: ["进度分析", "周报生成", "风险预警"],
  },
];

const WORKBENCH_AGENT_RECORDS_STORAGE_KEY = "frontis.workbenchAgentRecords.v2";

export const WORKBENCH_AGENT_RECORDS_UPDATED_EVENT = "frontis:workbench-agent-records-updated";

const normalizeRecords = (value: unknown): WorkbenchAgentRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): WorkbenchAgentRecord | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<WorkbenchAgentRecord>;
      if (!record.id || !record.name || !record.summary) {
        return null;
      }

      return {
        id: record.id,
        installSource: record.installSource,
        productId: record.productId,
        enterpriseAgentId: record.enterpriseAgentId,
        agentReleaseId: record.agentReleaseId,
        name: record.name,
        avatarUrl: record.avatarUrl,
        visualSeed: record.visualSeed || record.id,
        role: record.role || "AI 专家",
        model: record.model || "Frontis 托管模型",
        summary: record.summary,
        developerName: record.developerName,
        agentId: record.agentId || record.id,
        runtimeAgentId: record.runtimeAgentId || `rt-${record.id}`,
        skills: Array.isArray(record.skills) ? record.skills.filter(Boolean) : [],
      } satisfies WorkbenchAgentRecord;
    })
    .filter((item): item is WorkbenchAgentRecord => item !== null);
};

export const loadWorkbenchAgentRecords = (): WorkbenchAgentRecord[] => {
  try {
    const rawValue = localStorage.getItem(WORKBENCH_AGENT_RECORDS_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_WORKBENCH_AGENT_RECORDS;
    }

    return normalizeRecords(JSON.parse(rawValue));
  } catch {
    return DEFAULT_WORKBENCH_AGENT_RECORDS;
  }
};

const saveWorkbenchAgentRecords = (records: WorkbenchAgentRecord[]): void => {
  localStorage.setItem(
    WORKBENCH_AGENT_RECORDS_STORAGE_KEY,
    JSON.stringify(normalizeRecords(records)),
  );
  window.dispatchEvent(new CustomEvent(WORKBENCH_AGENT_RECORDS_UPDATED_EVENT));
};

export const upsertWorkbenchAgentRecord = (
  record: WorkbenchAgentRecord,
): WorkbenchAgentRecord[] => {
  const currentRecords = loadWorkbenchAgentRecords();
  const nextRecords = [
    record,
    ...currentRecords.filter(currentRecord => currentRecord.id !== record.id),
  ];

  saveWorkbenchAgentRecords(nextRecords);
  return nextRecords;
};

export const removeWorkbenchAgentRecord = (recordId: string): WorkbenchAgentRecord[] => {
  const nextRecords = loadWorkbenchAgentRecords().filter(record => record.id !== recordId);

  saveWorkbenchAgentRecords(nextRecords);
  return nextRecords;
};
