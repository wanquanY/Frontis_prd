import {
  buildProductTeamCollabFrames,
  buildProductTeamRiskFrames,
} from "@/mocks/dialogueScenario/productTeamFrames";
import {
  PRODUCT_TEAM_COLLAB_QUESTION,
  PRODUCT_TEAM_RISK_QUESTION,
} from "@/mocks/dialogueScenario/productTeamScenarioMock";
import type { ProductTeamScenarioSupportHelpers } from "@/mocks/dialogueScenario/productTeamSupport";
import type { DialogueScenarioDefinition } from "@/types/dialogueScenario";
import { dialogueScenarioRuntimeHelpers } from "@/utils/dialogueScenarioRuntime";

const productTeamScenarioSupportHelpers: ProductTeamScenarioSupportHelpers = {
  createMarkdownArtifact: dialogueScenarioRuntimeHelpers.createMarkdownArtifact,
  createJsonArtifact: dialogueScenarioRuntimeHelpers.createJsonArtifact,
  buildArtifactGroup: dialogueScenarioRuntimeHelpers.buildArtifactGroup,
  resolveTextArtifactSize: dialogueScenarioRuntimeHelpers.resolveTextArtifactSize,
  createScenarioDispatchResultItem: dialogueScenarioRuntimeHelpers.createScenarioDispatchResultItem,
};

const productTeamFrameRuntimeHelpers = {
  buildArtifactGroup: dialogueScenarioRuntimeHelpers.buildArtifactGroup,
  buildScenarioConversationFrame: dialogueScenarioRuntimeHelpers.buildScenarioConversationFrame,
  buildScenarioMessageSnapshot: dialogueScenarioRuntimeHelpers.buildScenarioMessageSnapshot,
  createTextBlock: dialogueScenarioRuntimeHelpers.createTextBlock,
  createThinkingBlock: dialogueScenarioRuntimeHelpers.createThinkingBlock,
  createToolUseBlock: dialogueScenarioRuntimeHelpers.createToolUseBlock,
  estimateTypewriterDelay: dialogueScenarioRuntimeHelpers.estimateTypewriterDelay,
  getScenarioArtifactBySuffix: dialogueScenarioRuntimeHelpers.getScenarioArtifactBySuffix,
  prettyJson: dialogueScenarioRuntimeHelpers.prettyJson,
};

/**
 * 产研协作专家团场景定义。
 */
export const PRODUCT_TEAM_SCENARIO_DEFINITIONS: DialogueScenarioDefinition[] = [
  {
    employeeId: "team-product",
    agentName: "产研协作专家团",
    sessionId: "dialogue-seed-team-product-collab",
    title: "产研协作专家团协同拆解",
    updatedAt: "11:08",
    triggerQuestion: PRODUCT_TEAM_COLLAB_QUESTION,
    buildFrames: sessionId =>
      buildProductTeamCollabFrames(
        sessionId,
        productTeamFrameRuntimeHelpers,
        productTeamScenarioSupportHelpers,
      ),
  },
  {
    employeeId: "team-product",
    agentName: "产研协作专家团",
    sessionId: "dialogue-seed-team-product-risk-hidden",
    title: "产研协作专家团上线风险",
    updatedAt: "11:15",
    triggerQuestion: PRODUCT_TEAM_RISK_QUESTION,
    seeded: false,
    buildFrames: sessionId =>
      buildProductTeamRiskFrames(
        sessionId,
        productTeamFrameRuntimeHelpers,
        productTeamScenarioSupportHelpers,
      ),
  },
];
