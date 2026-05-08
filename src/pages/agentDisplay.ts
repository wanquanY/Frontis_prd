import type {
  AiCeoAgentHomeConfig,
  AiCeoHomeCaseItem,
  AiCeoHomeReplayMessage,
} from "@/constants/aiCeoHome";

import type { DialogueSessionItem, EmployeeItem, FrontisWebRole } from "./types";

const CEO_WRITER_AGENT_ID = "employee-writer";
const BOSS_SIDE_CEO_WRITER_NAME = "CEO分身";
const EMPLOYEE_SIDE_CEO_WRITER_NAME = "ME";
const CEO_WRITER_DISPLAY_NAMES = [BOSS_SIDE_CEO_WRITER_NAME, EMPLOYEE_SIDE_CEO_WRITER_NAME];

const replaceCeoWriterDisplayName = (value: string, viewRole: FrontisWebRole): string => {
  const targetName = resolveAgentDisplayName(
    CEO_WRITER_AGENT_ID,
    BOSS_SIDE_CEO_WRITER_NAME,
    viewRole,
  );

  return CEO_WRITER_DISPLAY_NAMES.reduce(
    (content, currentName) => content.replaceAll(currentName, targetName),
    value,
  );
};

/**
 * 按当前工作台视角解析 Agent 展示名称。
 */
export const resolveAgentDisplayName = (
  agentId: string,
  fallbackName: string,
  viewRole: FrontisWebRole,
): string => {
  if (agentId === CEO_WRITER_AGENT_ID && viewRole === "employee") {
    return EMPLOYEE_SIDE_CEO_WRITER_NAME;
  }

  return fallbackName;
};

const mapReplayMessageForRole = (
  message: AiCeoHomeReplayMessage,
  viewRole: FrontisWebRole,
): AiCeoHomeReplayMessage => ({
  ...message,
  actor:
    message.actor.trim() === BOSS_SIDE_CEO_WRITER_NAME ||
    message.actor.trim() === EMPLOYEE_SIDE_CEO_WRITER_NAME
      ? replaceCeoWriterDisplayName(message.actor, viewRole)
      : message.actor,
  content: replaceCeoWriterDisplayName(message.content, viewRole),
});

const mapCaseItemForRole = (
  item: AiCeoHomeCaseItem,
  viewRole: FrontisWebRole,
): AiCeoHomeCaseItem => ({
  ...item,
  title: replaceCeoWriterDisplayName(item.title, viewRole),
  summary: replaceCeoWriterDisplayName(item.summary, viewRole),
  messages: item.messages.map(message => mapReplayMessageForRole(message, viewRole)),
});

/**
 * 返回带视角展示名的 Agent 数据副本。
 */
export const mapEmployeeForRole = (
  employee: EmployeeItem,
  viewRole: FrontisWebRole,
): EmployeeItem => ({
  ...employee,
  name: resolveAgentDisplayName(employee.id, employee.name, viewRole),
});

/**
 * 返回带视角展示名的会话数据副本。
 */
export const mapDialogueSessionForRole = (
  session: DialogueSessionItem,
  viewRole: FrontisWebRole,
): DialogueSessionItem => {
  const assistantName = resolveAgentDisplayName(session.employeeId, "", viewRole);

  return {
    ...session,
    messages: session.messages.map(message => ({
      ...message,
      author:
        message.role === "assistant" &&
        assistantName &&
        (message.author.trim() === BOSS_SIDE_CEO_WRITER_NAME ||
          message.author.trim() === EMPLOYEE_SIDE_CEO_WRITER_NAME ||
          message.author.trim().length === 0)
          ? assistantName
          : message.author,
      attachments: message.attachments?.map(attachment => ({ ...attachment })),
      blocks: message.blocks ? JSON.parse(JSON.stringify(message.blocks)) : undefined,
      followupSuggestions: message.followupSuggestions
        ? [...message.followupSuggestions]
        : undefined,
    })),
  };
};

/**
 * 返回带视角展示名的首页配置副本。
 */
export const mapAiCeoHomeConfigForRole = (
  agentId: string,
  config: AiCeoAgentHomeConfig,
  viewRole: FrontisWebRole,
): AiCeoAgentHomeConfig => {
  if (agentId !== CEO_WRITER_AGENT_ID) {
    return {
      ...config,
      skillItems: config.skillItems.map(item => ({ ...item })),
      promptItems: config.promptItems.map(item => ({ ...item })),
      guideItems: config.guideItems ? [...config.guideItems] : undefined,
      caseItems: config.caseItems
        ? config.caseItems.map(item => ({
            ...item,
            messages: item.messages.map(message => ({ ...message })),
          }))
        : undefined,
    };
  }

  return {
    ...config,
    intro: replaceCeoWriterDisplayName(config.intro, viewRole),
    guideLabel: config.guideLabel
      ? replaceCeoWriterDisplayName(config.guideLabel, viewRole)
      : undefined,
    guideTitle: config.guideTitle
      ? replaceCeoWriterDisplayName(config.guideTitle, viewRole)
      : undefined,
    guideItems: config.guideItems?.map(item => replaceCeoWriterDisplayName(item, viewRole)),
    skillItems: config.skillItems.map(item => ({ ...item })),
    promptItems: config.promptItems.map(item => ({ ...item })),
    caseItems: config.caseItems?.map(item => mapCaseItemForRole(item, viewRole)),
  };
};
