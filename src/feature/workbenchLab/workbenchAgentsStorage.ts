export interface WorkbenchAgentRecord {
  id: string;
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
    role: "销售沟通 · 对话型",
    model: "Claude Sonnet 4.6",
    summary: "根据客户画像与历史沟通记录，生成个性化销售话术与应对策略。",
    developerName: "销售团队",
    agentId: "team-shared-sales-script",
    runtimeAgentId: "rt-team-shared-sales-script",
    skills: ["客户意图识别", "话术生成", "历史对话召回"],
  },
  {
    id: "team-shared-opportunity",
    name: "商机跟进提醒",
    visualSeed: "team-shared-opportunity",
    role: "销售运营 · 监控型",
    model: "Claude Sonnet 4.6",
    summary: "自动追踪销售漏斗各阶段商机，根据停留时长推送跟进提醒。",
    developerName: "销售运营团队",
    agentId: "team-shared-opportunity",
    runtimeAgentId: "rt-team-shared-opportunity",
    skills: ["商机时效监控", "跟进行动建议"],
  },
  {
    id: "team-shared-delivery",
    name: "项目交付助手",
    visualSeed: "team-shared-delivery",
    role: "项目交付 · 协同型",
    model: "GPT-4.1",
    summary: "智能追踪项目里程碑与交付进度，自动生成周报与风险提醒。",
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
