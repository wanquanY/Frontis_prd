import type { ArtifactItem } from "@/types/artifact";
import type { DialogueScenarioDefinition, DialogueScenarioFrame } from "@/types/dialogueScenario";

import {
  ECOMMERCE_AUTOMATION_AGENT_DEMO,
  ECOMMERCE_AUTOMATION_SKILL_DEMOS,
} from "@/mocks/agentDemos/ecommerceAutomationDemo";
import {
  LIVE_BROADCAST_AGENT_DEMO,
  LIVE_BROADCAST_SKILL_DEMOS,
} from "@/mocks/agentDemos/liveBroadcastDemo";
import {
  XIAOCANMAMA_IP_AGENT_DEMO,
  XIAOCANMAMA_IP_SKILL_DEMOS,
} from "@/mocks/agentDemos/xiaocanMamaIpDemo";
import { dialogueScenarioRuntimeHelpers } from "@/utils/dialogueScenarioRuntime";

const {
  buildArtifactGroup,
  buildScenarioMessageFrame,
  createMarkdownArtifact,
  createTextBlock,
  createThinkingBlock,
  createToolUseBlock,
  estimateTypewriterDelay,
} = dialogueScenarioRuntimeHelpers;

const buildLiveBroadcastArtifacts = (
  sessionId: string,
  scenario: (typeof LIVE_BROADCAST_SKILL_DEMOS)[number],
): ArtifactItem[] =>
  buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      `${scenario.id}-artifact`,
      scenario.artifactFileName,
      LIVE_BROADCAST_AGENT_DEMO.name,
      scenario.artifactTaskName,
      scenario.responseMarkdown,
      "刚刚",
      scenario.artifactSize,
    ),
  );

const buildLiveBroadcastFrames = (
  sessionId: string,
  scenario: (typeof LIVE_BROADCAST_SKILL_DEMOS)[number],
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const toolBlocks = scenario.toolSteps.map((step, index) =>
    createToolUseBlock({
      id: `${messageId}-tool-${index + 1}`,
      name: step.name,
      displayName: step.displayName,
      purpose: step.purpose,
      status: "completed",
      output: step.output,
    }),
  );
  const artifacts = buildLiveBroadcastArtifacts(sessionId, scenario);

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking, true)],
      scenario.preview,
      880,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking), ...toolBlocks],
      scenario.preview,
      960,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, scenario.thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, scenario.responseMarkdown),
      ],
      scenario.preview,
      estimateTypewriterDelay(scenario.responseMarkdown),
      artifacts,
    ),
  ];
};

const buildEcommerceAutomationArtifacts = (
  sessionId: string,
  scenario: (typeof ECOMMERCE_AUTOMATION_SKILL_DEMOS)[number],
): ArtifactItem[] =>
  buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      `${scenario.id}-artifact`,
      scenario.artifactFileName,
      ECOMMERCE_AUTOMATION_AGENT_DEMO.name,
      scenario.artifactTaskName,
      scenario.responseMarkdown,
      "刚刚",
      scenario.artifactSize,
    ),
  );

const buildEcommerceAutomationFrames = (
  sessionId: string,
  scenario: (typeof ECOMMERCE_AUTOMATION_SKILL_DEMOS)[number],
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const toolBlocks = scenario.toolSteps.map((step, index) =>
    createToolUseBlock({
      id: `${messageId}-tool-${index + 1}`,
      name: step.name,
      displayName: step.displayName,
      purpose: step.purpose,
      status: "completed",
      output: step.output,
    }),
  );
  const artifacts = buildEcommerceAutomationArtifacts(sessionId, scenario);

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking, true)],
      scenario.preview,
      880,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking), ...toolBlocks],
      scenario.preview,
      960,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, scenario.thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, scenario.responseMarkdown),
      ],
      scenario.preview,
      estimateTypewriterDelay(scenario.responseMarkdown),
      artifacts,
    ),
  ];
};

const buildXiaocanMamaIpArtifacts = (
  sessionId: string,
  scenario: (typeof XIAOCANMAMA_IP_SKILL_DEMOS)[number],
): ArtifactItem[] =>
  buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      `${scenario.id}-artifact`,
      scenario.artifactFileName,
      XIAOCANMAMA_IP_AGENT_DEMO.name,
      scenario.artifactTaskName,
      scenario.responseMarkdown,
      "刚刚",
      scenario.artifactSize,
    ),
  );

const buildXiaocanMamaIpFrames = (
  sessionId: string,
  scenario: (typeof XIAOCANMAMA_IP_SKILL_DEMOS)[number],
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const toolBlocks = scenario.toolSteps.map((step, index) =>
    createToolUseBlock({
      id: `${messageId}-tool-${index + 1}`,
      name: step.name,
      displayName: step.displayName,
      purpose: step.purpose,
      status: "completed",
      output: step.output,
    }),
  );
  const artifacts = buildXiaocanMamaIpArtifacts(sessionId, scenario);

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking, true)],
      scenario.preview,
      880,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking), ...toolBlocks],
      scenario.preview,
      960,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, scenario.thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, scenario.responseMarkdown),
      ],
      scenario.preview,
      estimateTypewriterDelay(scenario.responseMarkdown),
      artifacts,
    ),
  ];
};

/**
 * 专家 demo 场景定义。
 */
export const AGENT_DEMO_SCENARIO_DEFINITIONS: DialogueScenarioDefinition[] = [
  ...ECOMMERCE_AUTOMATION_SKILL_DEMOS.map(item => ({
    employeeId: ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
    agentName: ECOMMERCE_AUTOMATION_AGENT_DEMO.name,
    sessionId: `dialogue-seed-ecom-ops-${item.id}`,
    title: item.title,
    updatedAt: item.updatedAt,
    triggerQuestion: item.prompt,
    buildFrames: (sessionId: string) => buildEcommerceAutomationFrames(sessionId, item),
  })),
  ...LIVE_BROADCAST_SKILL_DEMOS.map(item => ({
    employeeId: LIVE_BROADCAST_AGENT_DEMO.id,
    agentName: LIVE_BROADCAST_AGENT_DEMO.name,
    sessionId: `dialogue-seed-live-ops-${item.id}`,
    title: item.title,
    updatedAt: item.updatedAt,
    triggerQuestion: item.prompt,
    buildFrames: (sessionId: string) => buildLiveBroadcastFrames(sessionId, item),
  })),
  ...XIAOCANMAMA_IP_SKILL_DEMOS.map(item => ({
    employeeId: XIAOCANMAMA_IP_AGENT_DEMO.id,
    agentName: XIAOCANMAMA_IP_AGENT_DEMO.name,
    sessionId: `dialogue-seed-xiaocanmama-ip-${item.id}`,
    title: item.title,
    updatedAt: item.updatedAt,
    triggerQuestion: item.prompt,
    buildFrames: (sessionId: string) => buildXiaocanMamaIpFrames(sessionId, item),
  })),
];
