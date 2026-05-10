import dayjs, { type Dayjs } from "dayjs";

import type { ArtifactItem } from "@/types/artifact";
import type { Block } from "@/types/block";

import type { ChatMessage, MetaAgentWorkTrajectoryItem } from "../types";

export interface DialogueInsightTaskItem {
  id: string;
  taskDescription: string;
  expertName: string;
  status: DialogueInsightTaskStatus;
  expertAvatarUrl?: string;
  expertAvatarLabel?: string;
}

export type DialogueInsightTaskStatus = "running" | "completed" | "aborted";

interface BuildDialogueInsightTasksParams {
  activeName: string;
  messages: ChatMessage[];
  trajectories: MetaAgentWorkTrajectoryItem[];
}

const META_AGENT_ACTIVITY_NAME_SET = new Set(["ME", "系统"]);

const isMetaAgentActivityName = (name: string, activeName: string): boolean => {
  const normalizedName = name.trim();

  return (
    !normalizedName ||
    normalizedName === activeName ||
    META_AGENT_ACTIVITY_NAME_SET.has(normalizedName)
  );
};

const getBlockStringData = (block: Block, key: string): string => {
  const value = block.data[key];

  return typeof value === "string" ? value.trim() : "";
};

const flattenBlocks = (blocks: Block[] = []): Block[] =>
  blocks.flatMap(block => [block, ...flattenBlocks(block.children ?? [])]);

const isTaskDispatchBlock = (block: Block): boolean => {
  if (block.kind !== "tool_use") {
    return false;
  }

  const name = getBlockStringData(block, "name");
  const displayName = getBlockStringData(block, "display_name");

  return name === "task_dispatch" || displayName === "任务分发";
};

const resolveTaskStatus = (status: string): DialogueInsightTaskStatus => {
  const normalizedStatus = status.trim().toLowerCase();

  if (["success", "completed", "done", "succeeded", "finalized"].includes(normalizedStatus)) {
    return "completed";
  }

  if (
    [
      "failed",
      "error",
      "aborted",
      "abort",
      "canceled",
      "cancelled",
      "exception",
      "terminated",
    ].includes(normalizedStatus)
  ) {
    return "aborted";
  }

  return "running";
};

const getTaskStatusFromBlock = (block: Block): DialogueInsightTaskStatus => {
  if (block.isStreaming) {
    return "running";
  }

  const status = getBlockStringData(block, "status");
  if (status) {
    return resolveTaskStatus(status);
  }

  const stage = getBlockStringData(block, "stage").toLowerCase();
  if (stage === "end") {
    return "completed";
  }

  if (stage === "error") {
    return "aborted";
  }

  return "running";
};

const parseDispatchPurpose = (
  purpose: string,
  fallbackExpertName: string,
): {
  expertName: string;
  taskDescription: string;
} => {
  const matched = purpose.match(/^分配给([^：:]+)[：:]\s*(.+)$/);

  if (!matched) {
    return {
      expertName: fallbackExpertName,
      taskDescription: purpose,
    };
  }

  return {
    expertName: matched[1].trim() || fallbackExpertName,
    taskDescription: matched[2].trim() || purpose,
  };
};

const dedupeDialogueInsightTasks = (
  items: DialogueInsightTaskItem[],
): DialogueInsightTaskItem[] => {
  const existingKeys = new Set<string>();

  return items.filter(item => {
    const normalizedExpertName = item.expertName.trim();
    const normalizedTask = item.taskDescription.trim();
    const key = `${normalizedExpertName}::${normalizedTask}`;

    if (!normalizedExpertName || !normalizedTask || existingKeys.has(key)) {
      return false;
    }

    existingKeys.add(key);
    return true;
  });
};

const buildTasksFromDispatchBlocks = (
  messages: ChatMessage[],
  activeName: string,
): DialogueInsightTaskItem[] => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "assistant" || !message.blocks?.length) {
      continue;
    }

    const taskItems = flattenBlocks(message.blocks)
      .filter(isTaskDispatchBlock)
      .map(block => {
        const purpose = getBlockStringData(block, "purpose");
        const avatarLabel = getBlockStringData(block, "avatar_label");
        const avatarUrl = getBlockStringData(block, "avatar_url");
        const { expertName, taskDescription } = parseDispatchPurpose(purpose, avatarLabel);

        return {
          id: block.id,
          taskDescription,
          expertName,
          status: getTaskStatusFromBlock(block),
          expertAvatarUrl: avatarUrl || undefined,
          expertAvatarLabel: avatarLabel || undefined,
        };
      })
      .filter(item => !isMetaAgentActivityName(item.expertName, activeName));

    if (taskItems.length) {
      return dedupeDialogueInsightTasks(taskItems);
    }
  }

  return [];
};

/**
 * 从最新一轮 ME 任务分发记录中提取当前任务；没有工具块时回退到工作轨迹。
 */
export const buildDialogueInsightTasks = ({
  activeName,
  messages,
  trajectories,
}: BuildDialogueInsightTasksParams): DialogueInsightTaskItem[] => {
  const dispatchTasks = buildTasksFromDispatchBlocks(messages, activeName);

  if (dispatchTasks.length) {
    return dispatchTasks;
  }

  const latestTrajectory = trajectories[0];
  if (!latestTrajectory) {
    return [];
  }

  return dedupeDialogueInsightTasks(
    latestTrajectory.tasks
      .filter(task => !isMetaAgentActivityName(task.agentName, activeName))
      .map(task => ({
        id: task.id,
        taskDescription: task.title,
        expertName: task.agentName,
        status: task.status === "completed" ? "completed" : "running",
        expertAvatarLabel: task.agentName,
      })),
  );
};

/**
 * 获取当前自然日生成的成果文件；时间字段只有时分时按今日产物处理。
 */
export const filterTodayArtifactFiles = (
  files: ArtifactItem[],
  referenceDate: Dayjs = dayjs(),
): ArtifactItem[] => {
  const visibleFiles = files.filter(item => !item.isDeleted);
  const todayFiles = visibleFiles.filter(item => {
    const producedAtText = item.producedAt.trim();
    const producedAt = dayjs(producedAtText);

    return !producedAtText || !producedAt.isValid() || producedAt.isSame(referenceDate, "day");
  });

  return [...todayFiles].sort((left, right) => {
    const leftProducedAt = dayjs(left.producedAt);
    const rightProducedAt = dayjs(right.producedAt);
    const leftTimeValue = leftProducedAt.isValid() ? leftProducedAt.valueOf() : 0;
    const rightTimeValue = rightProducedAt.isValid() ? rightProducedAt.valueOf() : 0;

    if (leftTimeValue !== rightTimeValue) {
      return rightTimeValue - leftTimeValue;
    }

    return left.fileName.localeCompare(right.fileName, "zh-CN");
  });
};
