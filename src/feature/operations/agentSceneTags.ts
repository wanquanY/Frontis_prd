export const MIN_AI_AGENT_SCENE_TAG_COUNT = 1;
export const MAX_AI_AGENT_SCENE_TAG_COUNT = 5;

const DEFAULT_AI_AGENT_SCENE_TAG = "通用";
type AiAgentSceneTagInput = string | null | undefined;

export const normalizeAiAgentSceneTags = (sceneTags?: readonly AiAgentSceneTagInput[]): string[] => {
  const normalizedTags = (sceneTags ?? [])
    .map(tag => tag?.trim() ?? "")
    .filter(Boolean);

  return Array.from(new Set(normalizedTags)).slice(0, MAX_AI_AGENT_SCENE_TAG_COUNT);
};

export const resolveAiAgentSceneTags = (
  sceneTags?: readonly AiAgentSceneTagInput[],
  fallbackTags?: readonly AiAgentSceneTagInput[],
): string[] => {
  const normalizedTags = normalizeAiAgentSceneTags(sceneTags);

  if (normalizedTags.length >= MIN_AI_AGENT_SCENE_TAG_COUNT) {
    return normalizedTags;
  }

  const normalizedFallbackTags = normalizeAiAgentSceneTags(fallbackTags);

  if (normalizedFallbackTags.length >= MIN_AI_AGENT_SCENE_TAG_COUNT) {
    return normalizedFallbackTags;
  }

  return [DEFAULT_AI_AGENT_SCENE_TAG];
};
