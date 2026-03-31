import type { DialogueSessionItem, EmployeeItem, FrontisWebRole } from "./types";

const CEO_WRITER_AGENT_ID = "employee-writer";
const EMPLOYEE_SIDE_CEO_WRITER_NAME = "AI CEO教练";

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
        message.role === "assistant" && assistantName ? assistantName : message.author,
      attachments: message.attachments?.map(attachment => ({ ...attachment })),
      blocks: message.blocks ? JSON.parse(JSON.stringify(message.blocks)) : undefined,
    })),
  };
};
