export type WorkbenchSkillType = "workflow" | "skill" | "model" | "tool";
export type WorkbenchSkillVisibility = "public" | "private" | "team";
export type WorkbenchSkillMarketTab = "mcp" | "public" | "team" | "mine";
export type WorkbenchSkillCategoryFilter = "all" | WorkbenchSkillType;

export interface WorkbenchSkillVersionItem {
  version: string;
  releaseNote: string;
  publishTime: string;
}

export interface WorkbenchSkillItem {
  id: string;
  name: string;
  version: string;
  type: WorkbenchSkillType;
  tags: string[];
  description: string;
  publisher: string;
  publishTime: string;
  iconColor: string;
  iconText: string;
  visibility: WorkbenchSkillVisibility;
  isSharedToMe?: boolean;
  isSharedByMe?: boolean;
  versions: WorkbenchSkillVersionItem[];
}

export interface WorkbenchSkillPresetCover {
  key: string;
  label: string;
  gradient: string;
  emoji: string;
}

/* ─── Agent Store ─── */

export type WorkbenchAgentType = "metaagent" | "syngent" | "openclaw";
export type WorkbenchAgentCategory = "general" | "production" | "supply" | "sales";
export type WorkbenchAgentCategoryFilter = "all" | WorkbenchAgentCategory;
export type WorkbenchAgentMarketTab = "public" | "team" | "mine";

export interface WorkbenchAgentSkillRef {
  skillName: string;
  version: string;
}

export interface WorkbenchAgentFeedbackRow {
  id: string;
  summary: string;
  source: "线上回流" | "人工标注";
  rating: number;
  toolCallRounds: number;
  dialogueRounds: number;
  tokenUsage: number;
  enterprise: string;
}

export interface WorkbenchAgentVersionEvolution {
  skillTriggerAccuracy: string;
  skillTriggerAccuracyTrend: string;
  taskCompletionRate: string;
  taskCompletionRateTrend: string;
  qualityScore: string;
  qualityScoreTrend: string;
  executionTime: string;
  executionTimeTrend: string;
  tokenUsage: string;
  tokenUsageTrend: string;
  regressionRetention: string;
  regressionRetentionTrend: string;
}

export interface WorkbenchAgentEvalReportMetric {
  label: string;
  value: string;
  trend: string;
}

export interface WorkbenchAgentEvalReport {
  summary: string;
  overallScore: number;
  overallScoreTrend: string;
  metrics: WorkbenchAgentEvalReportMetric[];
  testTime: string;
  testRounds: number;
  testScenes: string[];
  issues: string;
  suggestions: string;
  conclusion: string;
}

export interface WorkbenchAgentVersionItem {
  version: string;
  releaseNote: string;
  publishTime: string;
  evolution?: WorkbenchAgentVersionEvolution;
  evalReport?: WorkbenchAgentEvalReport;
}

export interface WorkbenchAgentItem {
  id: string;
  name: string;
  version: string;
  agentType: WorkbenchAgentType;
  category: WorkbenchAgentCategory;
  tags: string[];
  description: string;
  publisher: string;
  publishTime: string;
  iconColor: string;
  iconText: string;
  visibility: WorkbenchSkillVisibility;
  isSharedToMe?: boolean;
  isSharedByMe?: boolean;
  skills: WorkbenchAgentSkillRef[];
  versions: WorkbenchAgentVersionItem[];
  feedbackData: WorkbenchAgentFeedbackRow[];
}

/* ─── Agent 工作空间（Frontis 开发） ─── */

export type WorkbenchAgentFramework = "MetaAgent" | "Syngent" | "OpenClaw";

export interface WorkbenchWorkspaceConversation {
  id: string;
  title: string;
  summary: string;
  date: string;
}

export interface WorkbenchWorkspaceKnowledgeBase {
  id: string;
  name: string;
  fileCount: number;
}

export interface WorkbenchWorkspaceFeedback {
  enterprise: string;
  count: number;
}

export interface WorkbenchWorkspaceResult {
  id: string;
  title: string;
  resultCount: number;
  lastDate: string;
}

export interface WorkbenchAgentWorkspace {
  id: string;
  name: string;
  description: string;
  iconColor: string;
  iconText: string;
  framework: WorkbenchAgentFramework;
  skillCount: number;
  skills: { name: string; version: string }[];
  createdAt: string;
  conversations: WorkbenchWorkspaceConversation[];
  knowledgeBases: WorkbenchWorkspaceKnowledgeBase[];
  feedbackData: WorkbenchWorkspaceFeedback[];
  results: WorkbenchWorkspaceResult[];
  fileCount: number;
  overviewText: string;
}
