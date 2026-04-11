import type { DialogueScenarioDefinition } from "@/types/dialogueScenario";

import { AGENT_DEMO_SCENARIO_DEFINITIONS } from "./agentDemoScenarioDefinitions";
import { AI_CEO_SCENARIO_DEFINITIONS } from "./aiCeoScenarioDefinitions";
import { PRODUCT_MANAGER_SCENARIO_DEFINITIONS } from "./productManagerScenarioDefinitions";
import { PRODUCT_TEAM_SCENARIO_DEFINITIONS } from "./productTeamScenarioDefinitions";

/**
 * 所有对话场景 mock 定义。
 */
export const SCENARIO_DEFINITIONS: DialogueScenarioDefinition[] = [
  ...AGENT_DEMO_SCENARIO_DEFINITIONS,
  ...AI_CEO_SCENARIO_DEFINITIONS,
  ...PRODUCT_MANAGER_SCENARIO_DEFINITIONS,
  ...PRODUCT_TEAM_SCENARIO_DEFINITIONS,
];
