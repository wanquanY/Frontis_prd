import type { ArtifactItem } from "@/types/artifact";
import type { Block } from "@/types/block";

import type { DialogueGeneratedPanelState, DialogueGeneratedResultItem } from "@/pages/types";

/**
 * 单轮对话场景帧。
 */
export interface DialogueScenarioFrame {
  delayMs: number;
  preview: string;
  blocks: Block[];
  messages?: DialogueScenarioMessageSnapshot[];
  artifacts?: ArtifactItem[];
  panel?: DialogueGeneratedPanelState;
  results?: DialogueGeneratedResultItem[];
  followupSuggestions?: string[];
}

/**
 * 多消息场景中的单条消息快照。
 */
export interface DialogueScenarioMessageSnapshot {
  key: string;
  author?: string;
  preview: string;
  blocks: Block[];
  followupSuggestions?: string[];
}

/**
 * 场景定义。
 */
export interface DialogueScenarioDefinition {
  employeeId: string;
  agentName: string;
  sessionId: string;
  title: string;
  updatedAt: string;
  triggerQuestion: string;
  seeded?: boolean;
  buildFrames: (sessionId: string) => DialogueScenarioFrame[];
}

/**
 * 单次场景命中结果。
 */
export interface DialogueScenario {
  employeeId: string;
  title: string;
  triggerQuestion: string;
  frames: DialogueScenarioFrame[];
}

/**
 * 场景回放中的单轮记录。
 */
export interface DialogueScenarioReplayRound {
  agentName: string;
  question: string;
  updatedAt: string;
  frames: DialogueScenarioFrame[];
}

/**
 * 场景回放结果。
 */
export interface DialogueScenarioReplay {
  employeeId: string;
  title: string;
  triggerQuestion: string;
  rounds: DialogueScenarioReplayRound[];
}
