import type { ArtifactItem } from "@/types/artifact";
import type {
  DialogueScenario,
  DialogueScenarioDefinition,
  DialogueScenarioReplay,
  DialogueScenarioReplayRound,
} from "@/types/dialogueScenario";
import {
  expandFramesForTypewriter,
  normalizeScenarioQuestion,
} from "@/utils/dialogueScenarioRuntime";
import { SCENARIO_DEFINITIONS } from "@/mocks/dialogueScenario/scenarioDefinitions";

import type {
  ChatMessage,
  DialogueGeneratedPanelState,
  DialogueGeneratedResultItem,
  DialogueSessionItem,
} from "./types";

interface SeedDialogueScenarioBundle {
  artifacts: ArtifactItem[];
  messages: ChatMessage[];
  panel?: DialogueGeneratedPanelState;
  preview: string;
  results: DialogueGeneratedResultItem[];
  updatedAt: string;
}

const findScenarioDefinitionByQuestion = (
  employeeId: string,
  question: string,
): DialogueScenarioDefinition | null =>
  SCENARIO_DEFINITIONS.find(
    item =>
      item.employeeId === employeeId &&
      normalizeScenarioQuestion(item.triggerQuestion) === normalizeScenarioQuestion(question),
  ) ?? null;

const appendUniqueItems = <TItem extends { id: string }>(target: TItem[], items: TItem[]): void => {
  const existingIds = new Set(target.map(item => item.id));

  items.forEach(item => {
    if (existingIds.has(item.id)) {
      return;
    }

    target.push(item);
    existingIds.add(item.id);
  });
};

const appendUniqueArtifacts = (target: ArtifactItem[], items: ArtifactItem[]): void => {
  const existingKeys = new Set(
    target.map(item => `${item.fileName}::${item.canonicalPath}::${item.mimeType}`),
  );

  items.forEach(item => {
    const artifactKey = `${item.fileName}::${item.canonicalPath}::${item.mimeType}`;

    if (existingKeys.has(artifactKey)) {
      return;
    }

    target.push(item);
    existingKeys.add(artifactKey);
  });
};

const buildDialogueScenarioReplayRounds = (
  definition: DialogueScenarioDefinition,
  frameScopeIdPrefix: string = definition.sessionId,
): DialogueScenarioReplayRound[] => {
  const rounds: DialogueScenarioReplayRound[] = [];
  const visitedQuestions = new Set<string>();
  let currentDefinition: DialogueScenarioDefinition | null = definition;
  let roundIndex = 0;

  while (currentDefinition && roundIndex < 12) {
    const normalizedQuestion = normalizeScenarioQuestion(currentDefinition.triggerQuestion);

    if (visitedQuestions.has(normalizedQuestion)) {
      break;
    }

    visitedQuestions.add(normalizedQuestion);

    const frameScopeId =
      roundIndex === 0 ? frameScopeIdPrefix : `${frameScopeIdPrefix}-round-${roundIndex + 1}`;

    rounds.push({
      agentName: currentDefinition.agentName,
      question: currentDefinition.triggerQuestion,
      updatedAt: currentDefinition.updatedAt,
      frames: expandFramesForTypewriter(currentDefinition.buildFrames(frameScopeId)),
    });

    const latestFrame = rounds[rounds.length - 1].frames.at(-1);
    const nextQuestion = latestFrame?.followupSuggestions?.[0];

    if (!nextQuestion) {
      break;
    }

    const nextDefinition = findScenarioDefinitionByQuestion(definition.employeeId, nextQuestion);

    if (!nextDefinition || nextDefinition.seeded !== false) {
      break;
    }

    currentDefinition = nextDefinition;
    roundIndex += 1;
  }

  return rounds;
};

const buildSeedDialogueScenarioBundle = (
  definition: DialogueScenarioDefinition,
): SeedDialogueScenarioBundle => {
  const messages: ChatMessage[] = [];
  const artifacts: ArtifactItem[] = [];
  const results: DialogueGeneratedResultItem[] = [];
  let latestPreview = definition.title;
  let latestUpdatedAt = definition.updatedAt;
  let latestPanel: DialogueGeneratedPanelState | undefined;
  const replayRounds = buildDialogueScenarioReplayRounds(definition);

  replayRounds.forEach((round, roundIndex) => {
    const frames = round.frames;
    const lastFrame = frames[frames.length - 1];
    const latestResultFrame = [...frames].reverse().find(item => item.results?.length);
    const latestPanelFrame = [...frames].reverse().find(item => item.panel);

    messages.push({
      id: `${definition.sessionId}-user-message-${roundIndex + 1}`,
      role: "user",
      author: "你",
      content: round.question,
      timeLabel: round.updatedAt,
    });

    const assistantMessages = lastFrame.messages?.length
      ? lastFrame.messages
      : [
          {
            key: `${definition.sessionId}-assistant-message-${roundIndex + 1}`,
            author: round.agentName,
            preview: lastFrame.preview,
            blocks: lastFrame.blocks,
            followupSuggestions: lastFrame.followupSuggestions,
          },
        ];

    assistantMessages.forEach((assistantMessage, messageIndex) => {
      messages.push({
        id: `${definition.sessionId}-assistant-message-${roundIndex + 1}-${messageIndex + 1}`,
        role: "assistant",
        author: assistantMessage.author?.trim() || round.agentName,
        content: assistantMessage.preview,
        timeLabel: round.updatedAt,
        blocks: assistantMessage.blocks,
        followupSuggestions: assistantMessage.followupSuggestions,
      });
    });

    latestPreview = lastFrame.preview;
    latestUpdatedAt = round.updatedAt;

    if (lastFrame.artifacts?.length) {
      appendUniqueArtifacts(artifacts, lastFrame.artifacts);
    }
    if (latestResultFrame?.results?.length) {
      appendUniqueItems(results, latestResultFrame.results);
    }
    if (latestPanelFrame?.panel) {
      latestPanel = latestPanelFrame.panel;
    }
  });

  return {
    messages,
    preview: latestPreview,
    updatedAt: latestUpdatedAt,
    artifacts,
    panel: latestPanel,
    results,
  };
};

/**
 * 构建场景回放数据。
 */
export const buildDialogueScenarioReplay = (
  employeeId: string,
  question: string,
  frameScopeIdPrefix?: string,
): DialogueScenarioReplay | null => {
  const matched = findScenarioDefinitionByQuestion(employeeId, question);
  if (!matched) {
    return null;
  }

  return {
    employeeId: matched.employeeId,
    title: matched.title,
    triggerQuestion: matched.triggerQuestion,
    rounds: buildDialogueScenarioReplayRounds(
      matched,
      frameScopeIdPrefix ?? `dialogue-scenario-replay-${Date.now()}-${matched.employeeId}`,
    ),
  };
};

/**
 * 根据 agent 与问题匹配对应的场景化模拟。
 */
export const findDialogueScenario = (
  employeeId: string,
  question: string,
  frameScopeId?: string,
): DialogueScenario | null => {
  const matched = findScenarioDefinitionByQuestion(employeeId, question);
  if (!matched) {
    return null;
  }

  return {
    employeeId: matched.employeeId,
    title: matched.title,
    triggerQuestion: matched.triggerQuestion,
    frames: expandFramesForTypewriter(
      matched.buildFrames(frameScopeId ?? `dialogue-scenario-${Date.now()}-${matched.employeeId}`),
    ),
  };
};

/**
 * 构建默认单聊场景种子会话。
 */
export const buildDialogueScenarioSeedSessions = (): DialogueSessionItem[] =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).map(definition => {
    const bundle = buildSeedDialogueScenarioBundle(definition);

    return {
      id: definition.sessionId,
      employeeId: definition.employeeId,
      title: definition.title,
      preview: bundle.preview,
      updatedAt: bundle.updatedAt,
      messages: bundle.messages,
    };
  });

/**
 * 构建默认单聊场景成果文件。
 */
export const buildDialogueScenarioSeedArtifacts = (): Record<string, ArtifactItem[]> =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).reduce<
    Record<string, ArtifactItem[]>
  >((result, definition) => {
    const bundle = buildSeedDialogueScenarioBundle(definition);
    if (bundle.artifacts.length) {
      result[definition.sessionId] = bundle.artifacts;
    }
    return result;
  }, {});

/**
 * 构建默认单聊场景右侧生成式面板。
 */
export const buildDialogueScenarioSeedPanels = (): Record<string, DialogueGeneratedPanelState> =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).reduce<
    Record<string, DialogueGeneratedPanelState>
  >((result, definition) => {
    const bundle = buildSeedDialogueScenarioBundle(definition);
    if (bundle.panel) {
      result[definition.sessionId] = bundle.panel;
    }
    return result;
  }, {});

/**
 * 构建默认单聊场景结果卡片。
 */
export const buildDialogueScenarioSeedResults = (): Record<string, DialogueGeneratedResultItem[]> =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).reduce<
    Record<string, DialogueGeneratedResultItem[]>
  >((result, definition) => {
    const bundle = buildSeedDialogueScenarioBundle(definition);
    if (bundle.results.length) {
      result[definition.sessionId] = bundle.results;
    }
    return result;
  }, {});
