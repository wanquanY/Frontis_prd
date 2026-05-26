export interface MeSchedulableAgentRecord {
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

const DEFAULT_ME_SCHEDULABLE_AGENT_RECORDS: MeSchedulableAgentRecord[] = [
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
];

const ME_SCHEDULABLE_AGENT_RECORDS_STORAGE_KEY = "frontis.meSchedulableAgentRecords.v3";

export const ME_SCHEDULABLE_AGENT_RECORDS_UPDATED_EVENT =
  "frontis:me-schedulable-agent-records-updated";

const normalizeRecords = (value: unknown): MeSchedulableAgentRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): MeSchedulableAgentRecord | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<MeSchedulableAgentRecord>;
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
      } satisfies MeSchedulableAgentRecord;
    })
    .filter((item): item is MeSchedulableAgentRecord => item !== null);
};

export const loadMeSchedulableAgentRecords = (): MeSchedulableAgentRecord[] => {
  try {
    const rawValue = localStorage.getItem(ME_SCHEDULABLE_AGENT_RECORDS_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_ME_SCHEDULABLE_AGENT_RECORDS;
    }

    return normalizeRecords(JSON.parse(rawValue));
  } catch {
    return [];
  }
};

const saveMeSchedulableAgentRecords = (records: MeSchedulableAgentRecord[]): void => {
  localStorage.setItem(
    ME_SCHEDULABLE_AGENT_RECORDS_STORAGE_KEY,
    JSON.stringify(normalizeRecords(records)),
  );
  window.dispatchEvent(new CustomEvent(ME_SCHEDULABLE_AGENT_RECORDS_UPDATED_EVENT));
};

export const upsertMeSchedulableAgentRecord = (
  record: MeSchedulableAgentRecord,
): MeSchedulableAgentRecord[] => {
  const currentRecords = loadMeSchedulableAgentRecords();
  const nextRecords = [
    record,
    ...currentRecords.filter(currentRecord => currentRecord.id !== record.id),
  ];

  saveMeSchedulableAgentRecords(nextRecords);
  return nextRecords;
};
