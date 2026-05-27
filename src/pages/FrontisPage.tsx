import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppstoreOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Empty, Modal, message } from "antd";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { AiCeoAgentHomeConfig, AiCeoHomeCaseItem } from "@/constants/aiCeoHome";
import { AI_CEO_AGENT_HOME_CONFIGS, AI_CEO_DEFAULT_HOME_CONFIG } from "@/constants/aiCeoHome";
import {
  EXPERT_PLAZA_LABEL,
  MANAGEMENT_CONSOLE_LABEL,
  MA_WORKBENCH_LABEL,
} from "@/constants/brand";
import {
  DEFAULT_FEISHU_QR_CODE,
  FEISHU_QR_CODE_STORAGE_KEY,
  FEISHU_QR_CONFIGURED_STORAGE_KEY,
  FEISHU_QR_UPDATED_EVENT,
} from "@/constants/feishuChannel";
import {
  getLoginPath,
  getSystemEntries,
  getSystemEntryMenuLabel,
  getTenantEntries,
  getTenantAdminManagementPath,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantUsers } from "@/feature/auth/mockTenantRegistry";
import type { MockAuthSystemEntry } from "@/feature/auth/types";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { useMeOnboardingProfileModal } from "@/feature/workspace/hooks/useMeOnboardingProfileModal";
import {
  clearRegistrationOnboardingDraft,
  loadRegistrationOnboardingDraft,
} from "@/feature/auth/registrationFlowStorage";
import {
  buildFrontisAgents,
  resolveLatestFulfillmentsByProductId,
  shouldContactForAgent,
  type StoreAgentItem,
} from "@/feature/workbenchLab/components/ExpertPlazaView";
import {
  loadWorkbenchAgentRecords,
  WORKBENCH_AGENT_RECORDS_UPDATED_EVENT,
  type WorkbenchAgentRecord,
} from "@/feature/workbenchLab/workbenchAgentsStorage";
import {
  loadStoredOperationsFulfillments,
  loadStoredOperationsProducts,
} from "@/feature/operations/commerceStorage";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import {
  FRONTIS_COMPLETE_PRD_V430_DOCUMENT_CONTENT,
  FRONTIS_COMPLETE_PRD_V430_DOCUMENT_NAME,
} from "@/mocks/documents/productManagerDocuments";
import {
  buildMetaAgentCapabilityDemoArtifacts,
  buildMetaAgentHistoryMessages,
} from "@/mocks/dialogueScenario/metaAgentHistoryMock";
import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_RESULTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_ORGANIZATION_DEPARTMENTS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";
import type { ArtifactItem } from "@/types/artifact";
import type {
  DialogueScenarioFrame,
  DialogueScenarioMessageSnapshot,
} from "@/types/dialogueScenario";
import { dialogueScenarioRuntimeHelpers } from "@/utils/dialogueScenarioRuntime";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";
import { hasUserInAccessScope } from "@/utils/organizationAccess";

import { DialoguePrototypeView } from "./components/DialoguePrototypeView";
import { MeOnboardingProfileModal } from "./components/MeOnboardingProfileModal";
import { buildDialogueScenarioReplay, findDialogueScenario } from "./dialogueScenarioSimulation";
import type {
  DialogueGeneratedResultItem,
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebRole,
  MetaAgentWorkTrajectoryItem,
  StatusTone,
  WorkspaceItem,
} from "./types";
import {
  buildAttachmentItem,
  buildMetaAgentWorkTrajectoryItems,
  createComposerAttachment,
  createId,
  getExpertTeamScenarioLabel,
  getAvatarUrl,
  getMetaagentAvatarUrl,
  revokeComposerAttachmentPreview,
} from "./utils";
import {
  mapAiCeoHomeConfigForRole,
  mapDialogueSessionForRole,
  mapEmployeeForRole,
  resolveAgentDisplayName,
} from "./agentDisplay";
import styles from "./FrontisPage.module.less";

interface FrontisPageProps {
  viewRole: FrontisWebRole;
  embedded?: boolean;
  resetSignal?: number;
  workspaceMode?: "metaAgent" | "expertStudio";
  pendingWorkbenchConversationSessionId?: string | null;
  onPendingWorkbenchConversationSessionConsumed?: () => void;
  pendingWorkbenchAgentId?: string | null;
  onPendingWorkbenchAgentConsumed?: () => void;
  onWorkbenchConversationNavChange?: (state: WorkbenchConversationNavState | null) => void;
}

export interface WorkbenchConversationNavSession {
  id: string;
  title: string;
  updatedAt: string;
  active: boolean;
}

export interface WorkbenchConversationNavGroup {
  employeeId: string;
  employeeName: string;
  sessions: WorkbenchConversationNavSession[];
}

export interface WorkbenchConversationNavState {
  groups: WorkbenchConversationNavGroup[];
  onRemoveSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onSelectSession: (sessionId: string) => void;
}

const DEFAULT_CONVERSATION_EMPLOYEE_ID = "employee-writer";
const MANAGEMENT_USER_ROLES = new Set(["enterpriseAdmin"]);
const ACTIVE_WORKSPACE_STATUSES = new Set<StatusTone>(["online", "busy", "idle"]);
const DEFAULT_WORKSPACE_AGENT_ORDER: string[] = [DEFAULT_CONVERSATION_EMPLOYEE_ID];
const TEAM_MENTION_ALL_LABEL = "所有agent";
const MAX_HOME_PROMPT_ITEM_COUNT = 6;
const DEFAULT_WORKSPACE_AGENT_NAME = "ME";
const EXPERT_TEAM_MAIN_AGENT_NAME = DEFAULT_WORKSPACE_AGENT_NAME;
const META_AGENT_SCENARIO_TEAM_ID = "team-product";
const META_AGENT_PRIMARY_SEED_SESSION_ID = "dialogue-seed-metaagent-collab";
const META_AGENT_ONBOARDING_SESSION_ID = "dialogue-seed-metaagent-onboarding";
const NEW_USER_ONBOARDING_TENANT_ID = "tenant-new-user-onboarding-demo";
const EXPERT_TEAM_MAIN_AGENT_DESCRIPTION =
  "作为默认主Agent，负责理解需求、调度你有权限使用的专家并统一交付。";
const PRODUCT_TEAM_COLLAB_QUESTION = "帮我把这个需求拆成核心模块、边界和依赖关系。";
const PRODUCT_TEAM_RISK_QUESTION = "这版方案上线前，架构层面最需要提前规避哪些风险？";
const META_AGENT_ONBOARDING_QUICK_PROMPT = "请根据我的信息生成公司宣传材料";

interface ExpertTeamDialogueRouting {
  mode: "primary" | "member" | "all";
  primaryEmployee: EmployeeItem;
  targetEmployee: EmployeeItem;
  teamMembers: EmployeeItem[];
}

const resolveScenarioFrameMessages = (
  frame: DialogueScenarioFrame,
  fallbackAuthor: string,
): DialogueScenarioMessageSnapshot[] =>
  frame.messages?.length
    ? frame.messages.map(message => ({
        ...message,
        author: message.author?.trim() || fallbackAuthor,
      }))
    : [
        {
          key: "__default__",
          author: fallbackAuthor,
          preview: frame.preview,
          blocks: frame.blocks,
          followupSuggestions: frame.followupSuggestions,
        },
      ];

const isMetaAgentEmployee = (employee: EmployeeItem | null): boolean =>
  Boolean(
    employee &&
    employee.id === DEFAULT_CONVERSATION_EMPLOYEE_ID &&
    employee.name === DEFAULT_WORKSPACE_AGENT_NAME,
  );

const buildMetaAgentTopicSession = ({
  id,
  preview,
  time,
  title,
  userContent,
  assistantContent,
}: {
  id: string;
  preview: string;
  time: string;
  title: string;
  userContent: string;
  assistantContent: string;
}): DialogueSessionItem => ({
  id,
  employeeId: DEFAULT_CONVERSATION_EMPLOYEE_ID,
  title,
  preview,
  updatedAt: time,
  messages: [
    {
      id: `${id}-user-1`,
      role: "user",
      author: "你",
      content: userContent,
      timeLabel: time,
    },
    {
      id: `${id}-assistant-1`,
      role: "assistant",
      author: DEFAULT_WORKSPACE_AGENT_NAME,
      content: assistantContent,
      timeLabel: time,
    },
  ],
});

const buildWorkbenchAgentTaskSession = ({
  agentName,
  assistantContent,
  employeeId,
  id,
  preview,
  time,
  title,
  userContent,
}: {
  agentName: string;
  assistantContent: string;
  employeeId: string;
  id: string;
  preview: string;
  time: string;
  title: string;
  userContent: string;
}): DialogueSessionItem => ({
  id,
  employeeId,
  title,
  preview,
  updatedAt: time,
  messages: [
    {
      id: `${id}-user-1`,
      role: "user",
      author: "你",
      content: userContent,
      timeLabel: time,
    },
    {
      id: `${id}-assistant-1`,
      role: "assistant",
      author: agentName,
      content: assistantContent,
      timeLabel: time,
    },
  ],
});

const WORKBENCH_AGENT_SEED_SESSIONS: DialogueSessionItem[] = [
  buildWorkbenchAgentTaskSession({
    id: "dialogue-seed-sales-script-intent",
    employeeId: "team-shared-sales-script",
    agentName: "销售话术助手",
    title: "客户异议话术整理",
    preview: "销售话术助手已根据客户画像整理高频异议和下一轮跟进话术。",
    time: "今天 20:18",
    userContent: "客户觉得预算偏高，还在对比竞品，帮我整理下一轮沟通话术。",
    assistantContent:
      "我会先把客户顾虑拆成预算、价值感和决策风险三类，再输出一组可直接使用的跟进话术。建议下一轮先确认客户最在意的预算边界，再用已购客户案例强化收益预期，最后给出可分阶段试点的成交路径。",
  }),
  buildWorkbenchAgentTaskSession({
    id: "dialogue-seed-opportunity-stalled",
    employeeId: "team-shared-opportunity",
    agentName: "商机跟进提醒",
    title: "重点商机停滞预警",
    preview: "商机跟进提醒已识别 3 个停留过久商机，并给出跟进行动建议。",
    time: "今天 20:36",
    userContent: "帮我看一下这周销售漏斗里哪些商机需要优先跟进。",
    assistantContent:
      "本周优先处理 3 个停滞商机：A 客户停留在方案确认 5 天，需要补一版 ROI 说明；B 客户采购负责人未回复，建议由销售主管介入；C 客户已进入合同评审，但法务问题未闭环，需要同步合同审查助手确认风险条款。",
  }),
  buildWorkbenchAgentTaskSession({
    id: "dialogue-seed-delivery-weekly-risk",
    employeeId: "team-shared-delivery",
    agentName: "项目交付助手",
    title: "本周交付风险周报",
    preview: "项目交付助手已汇总里程碑延迟、资源冲突和客户验收风险。",
    time: "今天 20:52",
    userContent: "把本周交付项目的风险整理一下，给我一个可以同步给负责人看的版本。",
    assistantContent:
      "本周主要风险集中在三个方面：两个项目验收材料滞后，一个项目测试资源与上线窗口冲突，一个客户的关键确认人本周无法参与评审。建议今天先锁定验收材料责任人，明天上午同步资源排期，周五前完成客户确认人替代方案。",
  }),
];

const buildMetaAgentSeedSessions = (): DialogueSessionItem[] => {
  const flattenedMessages = buildMetaAgentHistoryMessages(
    DEFAULT_WORKSPACE_AGENT_NAME,
    META_AGENT_PRIMARY_SEED_SESSION_ID,
  );

  return [
    {
      id: META_AGENT_PRIMARY_SEED_SESSION_ID,
      employeeId: DEFAULT_CONVERSATION_EMPLOYEE_ID,
      title: "ME 持续对话",
      preview: "ME 已汇总近期协同任务、工具调用样例和能力补充说明。",
      updatedAt: "11:22",
      messages: flattenedMessages,
    },
    buildMetaAgentTopicSession({
      id: "dialogue-seed-metaagent-weekly-task-plan",
      title: "本周任务编排",
      preview: "ME 已把本周原型调整拆成菜单、商店、详情和任务记录四条线。",
      time: "今天 20:12",
      userContent: "帮我把这周要改的原型任务按优先级排一下，不要漏掉商店和新任务。",
      assistantContent:
        "我会按影响面排序：先稳定新任务入口和任务记录，再处理商店筛选与专家卡片，最后校准详情弹窗和技能文件预览。每条任务都绑定验收点，避免改完以后只解决局部视觉问题。",
    }),
    buildMetaAgentTopicSession({
      id: "dialogue-seed-metaagent-store-experience",
      title: "商店体验优化",
      preview: "ME 汇总了商店分类、专家名片、技能详情和只读权限的调整口径。",
      time: "今天 20:27",
      userContent: "商店现在看起来还是乱，你帮我整理一下到底应该怎么改。",
      assistantContent:
        "商店需要保持三个原则：筛选只保留真实分类，专家卡片呈现专业名片感，详情只读且不暴露平台内部字段。技能详情直接展示名称、描述和文件内容，不再堆类型、版本、依赖这类无效信息。",
    }),
    buildMetaAgentTopicSession({
      id: "dialogue-seed-metaagent-expert-detail-rules",
      title: "专家详情规则梳理",
      preview: "ME 已明确商店专家只能查看，自己的专家才允许编辑和保存。",
      time: "今天 20:43",
      userContent: "专家详情里面不要再出现那些没意义字段，商店里的也不能编辑。",
      assistantContent:
        "我会把详情权限分成两类：商店来源只提供查看和添加/联系入口；我的专区或自建专家才有编辑、保存、核心文件维护和进化记录。详情页内容保留名称、描述、能力、工具、技能和核心文件，去掉 L3、Runtime、模型、形态等内部字段。",
    }),
    buildMetaAgentTopicSession({
      id: "dialogue-seed-metaagent-skill-file-preview",
      title: "技能文件预览校准",
      preview: "ME 已把技能弹窗收敛为名称、描述和文件内容三块。",
      time: "今天 21:01",
      userContent: "技能详情别搞复杂，参考文件预览那种结构。",
      assistantContent:
        "技能详情会直接按文件浏览器模式组织：左侧是技能包内文件列表，右侧展示当前文件内容。顶部只保留技能名称和描述，不再展示类型、状态、场景分类、发布时间、版本和依赖。",
    }),
    buildMetaAgentTopicSession({
      id: "dialogue-seed-metaagent-task-record-menu",
      title: "任务记录菜单调整",
      preview: "ME 已把任务记录移动到最左侧菜单，并按 AI 专家分组展示。",
      time: "今天 21:18",
      userContent: "任务记录要放到最左侧菜单栏，而且新任务不要自动进入历史任务。",
      assistantContent:
        "左侧菜单会常驻任务记录，并按 AI 专家分组。点击新任务只回到首页，只有点击某条任务记录才进入具体任务。每个专家默认展示前五条，可展开更多，也可以点击专家名整体收起。",
    }),
    buildMetaAgentTopicSession({
      id: "dialogue-seed-metaagent-evolution-data",
      title: "进化数据口径复盘",
      preview: "ME 已区分未添加专家的空进化态和已使用专家的进化数据态。",
      time: "今天 21:36",
      userContent: "进化页要根据是否添加和是否有数据判断，不要所有专家都展示成长内容。",
      assistantContent:
        "我会把“成长”统一改为“进化”。未添加、未购买或仅联系的专家展示暂无进化记录；已添加并产生数据的专家展示进化曲线、进化路径和进化证据，用真实记忆、技能和会话沉淀来支撑。",
    }),
  ];
};

const INITIAL_META_AGENT_SEED_SESSIONS = buildMetaAgentSeedSessions();
const NORMALIZED_INITIAL_DIALOGUE_SESSIONS = [
  ...INITIAL_DIALOGUE_SESSIONS.filter(item => item.employeeId !== DEFAULT_CONVERSATION_EMPLOYEE_ID),
  ...INITIAL_META_AGENT_SEED_SESSIONS,
  ...WORKBENCH_AGENT_SEED_SESSIONS,
];

const buildMetaAgentOnboardingSession = (): DialogueSessionItem => ({
  id: META_AGENT_ONBOARDING_SESSION_ID,
  employeeId: DEFAULT_CONVERSATION_EMPLOYEE_ID,
  title: "欢迎使用 ME",
  preview: "ME 可以理解你的目标、调度 AI 专家、沉淀成果，也可以按你的习惯设置名称和风格。",
  updatedAt: "刚刚",
  messages: [
    {
      id: "metaagent-onboarding-assistant-1",
      role: "assistant",
      author: DEFAULT_WORKSPACE_AGENT_NAME,
      content: `**你好，我是 ME，你在 AI 世界里的数字分身。**

我会在持续协作中了解你的目标、偏好、判断标准和优先级。面对任务时，我会代表你在 AI 世界里行动：判断该调度哪些 AI 专家、如何拆解任务、哪些结果需要优先处理，并把过程、结论和成果向你汇报。

你可以先从这些事情开始：

- 告诉我你的业务目标、工作背景和常用判断标准
- 上传资料、会议记录或历史文件，让我逐步积累你的个人工作记忆
- 交给我一个任务，我会替你调度专家团推进，并同步关键进展`,
      timeLabel: "刚刚",
      followupSuggestions: [META_AGENT_ONBOARDING_QUICK_PROMPT],
    },
  ],
});

const isNewUserOnboardingTenant = (tenantId?: string): boolean =>
  tenantId === NEW_USER_ONBOARDING_TENANT_ID;

const mapStoreAgentToEmployee = (agent: StoreAgentItem): EmployeeItem => ({
  id: agent.id,
  name: agent.name,
  avatarUrl: getAvatarUrl(agent.visualSeed),
  role: `${agent.scene} · ${agent.techShape}`,
  portalRoles: ["admin", "employee"],
  status: "online",
  workspaceId: "workspace-cloud",
  connectionMode: "cloud",
  model: agent.model,
  summary: agent.summary,
  lastAction: "已从商店添加，可由 ME 调度。",
  source: "coworker",
  visibility: "all",
  developerName: agent.submitterLabel,
  subAgentModel: agent.model,
  agentId: agent.product?.linkedAgentId || agent.id,
  runtimeAgentId: `rt-${agent.id}`,
  accessScopeSubjects: [],
  boundMembers: [],
  welcomeMessage: `我是${agent.name}，${agent.summary}`,
  systemPrompt: `你是${agent.name}，${agent.summary}`,
  skills: agent.capabilities.map(item => item.name),
});

const mapWorkbenchRecordToEmployee = (record: WorkbenchAgentRecord): EmployeeItem => ({
  id: record.id,
  name: record.name,
  avatarUrl: record.avatarUrl || getAvatarUrl(record.visualSeed),
  role: record.role,
  portalRoles: ["admin", "employee"],
  status: "online",
  workspaceId: "workspace-cloud",
  connectionMode: "cloud",
  model: record.model,
  summary: record.summary,
  lastAction: "已添加到工作台，可在新任务中使用。",
  source: "coworker",
  visibility: "all",
  developerName: record.developerName,
  subAgentModel: record.model,
  agentId: record.agentId,
  runtimeAgentId: record.runtimeAgentId,
  accessScopeSubjects: [],
  boundMembers: [],
  welcomeMessage: `我是${record.name}，${record.summary}`,
  systemPrompt: `你是${record.name}，${record.summary}`,
  skills: record.skills,
});

const buildInitialDialogueSessions = (
  viewRole: FrontisWebRole,
  tenantId?: string,
): DialogueSessionItem[] => {
  const sourceSessions = isNewUserOnboardingTenant(tenantId)
    ? [
        ...INITIAL_DIALOGUE_SESSIONS.filter(
          item => item.employeeId !== DEFAULT_CONVERSATION_EMPLOYEE_ID,
        ),
        buildMetaAgentOnboardingSession(),
      ]
    : NORMALIZED_INITIAL_DIALOGUE_SESSIONS;

  return sourceSessions.map(item => mapDialogueSessionForRole(item, viewRole));
};

const buildInitialDialogueArtifacts = (tenantId?: string): Record<string, ArtifactItem[]> =>
  isNewUserOnboardingTenant(tenantId)
    ? { ...INITIAL_DIALOGUE_ARTIFACTS, [META_AGENT_ONBOARDING_SESSION_ID]: [] }
    : NORMALIZED_INITIAL_DIALOGUE_ARTIFACTS;

const buildInitialDialogueResults = (
  tenantId?: string,
): Record<string, DialogueGeneratedResultItem[]> =>
  isNewUserOnboardingTenant(tenantId)
    ? { ...INITIAL_DIALOGUE_RESULTS, [META_AGENT_ONBOARDING_SESSION_ID]: [] }
    : NORMALIZED_INITIAL_DIALOGUE_RESULTS;

const createMetaAgentV430PrdArtifact = (): ArtifactItem =>
  dialogueScenarioRuntimeHelpers.createMarkdownArtifact(
    META_AGENT_PRIMARY_SEED_SESSION_ID,
    "metaagent-frontis-complete-prd-v430",
    FRONTIS_COMPLETE_PRD_V430_DOCUMENT_NAME,
    DEFAULT_WORKSPACE_AGENT_NAME,
    "430 PRD 交付",
    FRONTIS_COMPLETE_PRD_V430_DOCUMENT_CONTENT,
    "刚刚",
    dialogueScenarioRuntimeHelpers.resolveTextArtifactSize(
      FRONTIS_COMPLETE_PRD_V430_DOCUMENT_CONTENT,
    ),
  );
const NORMALIZED_INITIAL_DIALOGUE_ARTIFACTS: Record<string, ArtifactItem[]> = {
  ...INITIAL_DIALOGUE_ARTIFACTS,
  [META_AGENT_PRIMARY_SEED_SESSION_ID]: [
    ...buildMetaAgentCapabilityDemoArtifacts(
      META_AGENT_PRIMARY_SEED_SESSION_ID,
      DEFAULT_WORKSPACE_AGENT_NAME,
    ),
    createMetaAgentV430PrdArtifact(),
  ],
};
const NORMALIZED_INITIAL_DIALOGUE_RESULTS: Record<string, DialogueGeneratedResultItem[]> = {
  ...INITIAL_DIALOGUE_RESULTS,
  [META_AGENT_PRIMARY_SEED_SESSION_ID]: [],
};

const clampHomePromptItems = (config: AiCeoAgentHomeConfig): AiCeoAgentHomeConfig => ({
  ...config,
  promptItems: config.promptItems.slice(0, MAX_HOME_PROMPT_ITEM_COUNT),
});

const resolveRoleAwareHomeConfig = (
  agentId: string,
  config: AiCeoAgentHomeConfig,
  viewRole: FrontisWebRole,
): AiCeoAgentHomeConfig =>
  clampHomePromptItems(mapAiCeoHomeConfigForRole(agentId, config, viewRole));

const buildLiveDialogueResults = (
  sessionId: string,
  frame: {
    panel?: DialogueGeneratedResultItem["panel"];
    results?: DialogueGeneratedResultItem[];
  },
): DialogueGeneratedResultItem[] => {
  if (frame.results?.length) {
    return frame.results;
  }

  if (!frame.panel || frame.panel.kind !== "dispatchExecution") {
    return [];
  }

  return [
    {
      id: `${sessionId}-${frame.panel.id}-live`,
      title: frame.panel.title,
      subtitle: frame.panel.subtitle,
      createdAt: "刚刚",
      badge: frame.panel.skillName,
      panel: frame.panel,
    },
  ];
};

interface CaseReplayState {
  artifacts: ArtifactItem[];
  openPanel: "artifacts" | "results" | null;
  practiceQuestion: string;
  results: DialogueGeneratedResultItem[];
  session: DialogueSessionItem;
}

const appendUniqueArtifacts = (target: ArtifactItem[], items: ArtifactItem[]): void => {
  const existingKeys = new Set(
    target.map(item => `${item.fileName}::${item.canonicalPath}::${item.mimeType}`),
  );

  items.forEach(item => {
    const nextKey = `${item.fileName}::${item.canonicalPath}::${item.mimeType}`;
    if (existingKeys.has(nextKey)) {
      return;
    }
    target.push(item);
    existingKeys.add(nextKey);
  });
};

const appendUniqueResults = (
  target: DialogueGeneratedResultItem[],
  items: DialogueGeneratedResultItem[],
): void => {
  const existingIds = new Set(target.map(item => item.id));

  items.forEach(item => {
    if (existingIds.has(item.id)) {
      return;
    }
    target.push(item);
    existingIds.add(item.id);
  });
};

const resolveCasePracticeQuestion = (item: AiCeoHomeCaseItem): string =>
  item.replayScenarioQuestion?.trim() ||
  item.messages.find(message => message.role === "user")?.content.trim() ||
  item.title;

const buildCaseReplayState = (
  employee: EmployeeItem,
  item: AiCeoHomeCaseItem,
  viewRole: FrontisWebRole,
): CaseReplayState => {
  const replaySessionId = createId(`dialogue-case-${item.id}`);
  const practiceQuestion = resolveCasePracticeQuestion(item);
  const replay = item.replayScenarioQuestion
    ? buildDialogueScenarioReplay(
        resolveDialogueScenarioEmployeeId(employee),
        item.replayScenarioQuestion,
        replaySessionId,
      )
    : null;

  if (!replay) {
    const messages = item.messages.map(message => ({
      id: `${replaySessionId}-${message.id}`,
      role: message.role,
      author:
        message.role === "assistant"
          ? resolveAgentDisplayName(employee.id, message.actor, viewRole)
          : message.actor,
      content: message.content,
      timeLabel: "案例记录",
    }));

    return {
      session: {
        id: replaySessionId,
        employeeId: employee.id,
        title: item.title,
        preview: item.summary,
        updatedAt: "案例记录",
        messages,
      },
      artifacts: [],
      results: [],
      openPanel: null,
      practiceQuestion,
    };
  }

  const artifacts: ArtifactItem[] = [];
  const results: DialogueGeneratedResultItem[] = [];
  let preview = item.summary;
  const caseMessages = replay.rounds.flatMap((round, roundIndex) => {
    round.frames.forEach(frame => {
      if (frame.artifacts?.length) {
        appendUniqueArtifacts(artifacts, frame.artifacts);
      }

      const nextResults = buildLiveDialogueResults(replaySessionId, frame);
      if (nextResults.length) {
        appendUniqueResults(results, nextResults);
      }
    });

    const lastFrame = round.frames[round.frames.length - 1];
    preview = lastFrame?.preview ?? preview;

    return [
      {
        id: `${replaySessionId}-user-${roundIndex + 1}`,
        role: "user" as const,
        author: "你",
        content: round.question,
        timeLabel: round.updatedAt,
      },
      {
        id: `${replaySessionId}-assistant-${roundIndex + 1}`,
        role: "assistant" as const,
        author: resolveAgentDisplayName(employee.id, round.agentName, viewRole),
        content: lastFrame?.preview ?? item.summary,
        timeLabel: round.updatedAt,
        blocks: lastFrame?.blocks,
        followupSuggestions: lastFrame?.followupSuggestions,
      },
    ];
  });

  return {
    session: {
      id: replaySessionId,
      employeeId: employee.id,
      title: item.title,
      preview,
      updatedAt: "案例记录",
      messages: caseMessages,
    },
    artifacts,
    results,
    openPanel: results.length > 0 ? "results" : artifacts.length > 0 ? "artifacts" : null,
    practiceQuestion,
  };
};

const buildWorkspaceDefaultAgent = (
  employee: EmployeeItem,
  workspace: WorkspaceItem | null,
  memberEmployees: EmployeeItem[],
  currentUserId?: string,
  currentUserName?: string,
  nameOverride?: string,
): EmployeeItem | null => {
  const homeConfig = AI_CEO_AGENT_HOME_CONFIGS[employee.id] ?? AI_CEO_DEFAULT_HOME_CONFIG;
  const resolvedWorkspaceId = workspace?.id ?? employee.workspaceId;
  const isWorkspaceOnline = workspace ? ACTIVE_WORKSPACE_STATUSES.has(workspace.status) : true;
  const resolvedConnectionMode = workspace
    ? workspace.type === "cloud"
      ? "cloud"
      : "local"
    : employee.connectionMode;
  const resolvedModel = workspace
    ? workspace.type === "cloud"
      ? "gpt-4o"
      : "local-runtime"
    : employee.model;
  const resolvedName = nameOverride?.trim() || DEFAULT_WORKSPACE_AGENT_NAME;
  const primaryMember = memberEmployees.find(item => item.id === employee.id) ?? memberEmployees[0];
  const canCoordinateExperts = memberEmployees.length > 0;

  return {
    ...employee,
    id: employee.id,
    name: resolvedName,
    avatarUrl: getMetaagentAvatarUrl(employee.id),
    role: "默认专家",
    isExpertTeam: canCoordinateExperts,
    expertTeamId: canCoordinateExperts ? META_AGENT_SCENARIO_TEAM_ID : undefined,
    expertTeamMemberIds: canCoordinateExperts ? memberEmployees.map(item => item.id) : undefined,
    expertTeamPrimaryMemberId: canCoordinateExperts ? primaryMember?.id : undefined,
    portalRoles: ["admin", "employee"],
    status: isWorkspaceOnline ? "online" : "offline",
    workspaceId: resolvedWorkspaceId,
    connectionMode: resolvedConnectionMode,
    model: resolvedModel,
    summary: canCoordinateExperts
      ? "默认专家入口，可结合需求调度你有权限使用的全部 AI 专家协同完成任务。"
      : "默认专家入口，负责理解需求并直接协助完成通用工作任务。",
    lastAction: isWorkspaceOnline
      ? canCoordinateExperts
        ? `默认已可用，可按需调度 ${memberEmployees.length} 位专家协同工作。`
        : "默认已可用，可直接开始对话。"
      : "当前工作台未就绪，可稍后重试。",
    source: "openclaw",
    visibility: "all",
    subAgentModel: resolvedConnectionMode === "cloud" ? "gpt-4o-mini" : "device-runtime",
    agentId: `default-agent-${employee.id}`,
    runtimeAgentId: `default-runtime-${employee.id}`,
    accessScopeSubjects:
      currentUserId && currentUserName
        ? [
            {
              subjectId: currentUserId,
              subjectName: currentUserName,
              subjectType: "user",
            },
          ]
        : [],
    boundMembers: currentUserName ? [currentUserName] : [],
    welcomeMessage: canCoordinateExperts
      ? `我是${resolvedName}，会先理解你的需求，再调度你当前有权限使用的专家一起完成任务。`
      : `我是${resolvedName}，可以直接帮你处理日常工作问题与协作任务。`,
    systemPrompt: canCoordinateExperts
      ? `你是${resolvedName}，作为工作台默认主Agent，先理解用户目标，再调度用户当前有权限使用的专家协同完成任务，并统一输出结果。`
      : `你是${resolvedName}，作为工作台默认专家，优先理解用户目标并直接协助完成通用工作任务。`,
    skills: homeConfig.skillItems.map(item => item.id),
  };
};

const buildMetaAgentHomeConfig = (
  memberEmployees: EmployeeItem[],
  primaryConfig: AiCeoAgentHomeConfig,
): AiCeoAgentHomeConfig => {
  const mergedSkillItems = Array.from(
    new Map(
      memberEmployees.flatMap(item => {
        const config = AI_CEO_AGENT_HOME_CONFIGS[item.id] ?? AI_CEO_DEFAULT_HOME_CONFIG;
        return config.skillItems.map(skill => [skill.id, skill] as const);
      }),
    ).values(),
  );
  const metaPromptItems = [
    {
      id: "metaagent-1",
      question: "按照现在 ME 的能力总表，帮我重新梳理对话中的工具调用展示。",
    },
    {
      id: "metaagent-2",
      question: "这轮如果创建或编辑了文件，最后帮我把文件卡片放到回复结尾。",
    },
    {
      id: "metaagent-3",
      question: "调用 AI 专家时，把右上角进度卡片和今日成果一起同步出来。",
    },
    {
      id: "metaagent-4",
      question: "把本轮过程整理进工作记录，保留工具摘要和最终成果。",
    },
  ];
  const fallbackCaseImage = primaryConfig.caseItems?.[0]?.coverImage;
  const metaCaseItems: AiCeoHomeCaseItem[] = [
    {
      id: "metaagent-case-tool-display",
      scene: "工具消息",
      title: "ME 梳理工具调用展示",
      summary: "ME 按真实执行顺序展示思考、工具、Skill、MCP、AI 专家任务和文件卡片。",
      coverImage: fallbackCaseImage,
      replayScenarioQuestion: metaPromptItems[0].question,
      messages: [
        {
          id: "metaagent-case-tool-display-1",
          role: "user",
          actor: "你",
          content: metaPromptItems[0].question,
        },
        {
          id: "metaagent-case-tool-display-2",
          role: "assistant",
          actor: DEFAULT_WORKSPACE_AGENT_NAME,
          content: "我会按任务顺序展示思考、工具调用、协作进度和最终文件卡片。",
        },
      ],
    },
    {
      id: "metaagent-case-work-record",
      scene: "工作记录",
      title: "ME 汇总本轮成果",
      summary: "ME 在任务结束后沉淀工具摘要、AI 专家进度、文件卡片和工作记录。",
      coverImage: primaryConfig.caseItems?.[1]?.coverImage ?? fallbackCaseImage,
      replayScenarioQuestion: metaPromptItems[3].question,
      messages: [
        {
          id: "metaagent-case-work-record-1",
          role: "user",
          actor: "你",
          content: metaPromptItems[3].question,
        },
        {
          id: "metaagent-case-work-record-2",
          role: "assistant",
          actor: DEFAULT_WORKSPACE_AGENT_NAME,
          content: "我会把本轮过程压成可追溯的工作记录，并把产出文件放到最终回复。",
        },
      ],
    },
  ];

  return clampHomePromptItems({
    intro: `我是${DEFAULT_WORKSPACE_AGENT_NAME}，会先理解你的目标，再调用你当前有权限使用的专家协同完成任务。`,
    guideLabel: DEFAULT_WORKSPACE_AGENT_NAME,
    guideTitle: "适合处理需要多位 AI 专家协同的复杂需求，直接描述目标、背景和限制条件即可。",
    guideItems: [
      "我会先判断需要哪些专家参与，再统一拆解分工与交付节奏。",
      "你可以直接描述问题，也可以用 @所有agent 触发全员协同分析。",
      "最终输出会由我统一整合，不需要你分别和每个专家反复沟通。",
    ],
    skillItems: mergedSkillItems,
    promptItems: metaPromptItems,
    caseItems: metaCaseItems,
  });
};

/**
 * 解析当前专家团的成员列表。
 */
const resolveExpertTeamMembers = (
  employee: EmployeeItem | null,
  employees: EmployeeItem[],
): EmployeeItem[] => {
  if (!employee?.isExpertTeam || !employee.expertTeamMemberIds?.length) {
    return [];
  }

  return employee.expertTeamMemberIds
    .map(memberId => {
      const member = employees.find(item => item.id === memberId) ?? null;
      if (!member) {
        return null;
      }

      if (memberId !== employee.expertTeamPrimaryMemberId) {
        return member;
      }

      return {
        ...member,
        name: EXPERT_TEAM_MAIN_AGENT_NAME,
        avatarUrl: getMetaagentAvatarUrl(`${employee.id}-${member.id}`),
        role: "专家团默认主agent",
        summary: EXPERT_TEAM_MAIN_AGENT_DESCRIPTION,
        lastAction: `作为${employee.name}默认主agent，负责理解需求、调度成员与统一交付。`,
        welcomeMessage: `我是${EXPERT_TEAM_MAIN_AGENT_NAME}，${EXPERT_TEAM_MAIN_AGENT_DESCRIPTION}`,
        systemPrompt: `你是${employee.name}的默认主agent，${EXPERT_TEAM_MAIN_AGENT_DESCRIPTION}`,
      } satisfies EmployeeItem;
    })
    .filter((item): item is EmployeeItem => item !== null);
};

/**
 * 构建专家团首页配置，沿用主专家案例并合并成员技能。
 */
const buildExpertTeamHomeConfig = (
  expertTeam: EmployeeItem,
  memberEmployees: EmployeeItem[],
  viewRole: FrontisWebRole,
): AiCeoAgentHomeConfig => {
  const primaryEmployee =
    memberEmployees.find(item => item.id === expertTeam.expertTeamPrimaryMemberId) ??
    memberEmployees[0];
  const primaryConfig = primaryEmployee
    ? resolveRoleAwareHomeConfig(
        primaryEmployee.id,
        AI_CEO_AGENT_HOME_CONFIGS[primaryEmployee.id] ?? AI_CEO_DEFAULT_HOME_CONFIG,
        viewRole,
      )
    : resolveRoleAwareHomeConfig("employee-writer", AI_CEO_DEFAULT_HOME_CONFIG, viewRole);
  if (expertTeam.name === DEFAULT_WORKSPACE_AGENT_NAME) {
    return buildMetaAgentHomeConfig(memberEmployees, primaryConfig);
  }
  const mergedSkillItems = Array.from(
    new Map(
      memberEmployees.flatMap(item => {
        const config = AI_CEO_AGENT_HOME_CONFIGS[item.id] ?? AI_CEO_DEFAULT_HOME_CONFIG;
        return config.skillItems.map(skill => [skill.id, skill] as const);
      }),
    ).values(),
  );
  const mergedPromptItems = Array.from(
    new Map(
      memberEmployees.flatMap(item => {
        const config = resolveRoleAwareHomeConfig(
          item.id,
          AI_CEO_AGENT_HOME_CONFIGS[item.id] ?? AI_CEO_DEFAULT_HOME_CONFIG,
          viewRole,
        );
        return config.promptItems.map(prompt => [prompt.id, prompt] as const);
      }),
    ).values(),
  ).slice(0, MAX_HOME_PROMPT_ITEM_COUNT);
  const promptItems =
    expertTeam.id === "team-product"
      ? [
          { id: "team-product-1", question: PRODUCT_TEAM_COLLAB_QUESTION },
          { id: "team-product-2", question: PRODUCT_TEAM_RISK_QUESTION },
          ...mergedPromptItems.filter(
            item =>
              item.question !== PRODUCT_TEAM_COLLAB_QUESTION &&
              item.question !== PRODUCT_TEAM_RISK_QUESTION,
          ),
        ].slice(0, MAX_HOME_PROMPT_ITEM_COUNT)
      : mergedPromptItems;
  const scenarioLabel = getExpertTeamScenarioLabel(expertTeam.summary, expertTeam.name);

  return clampHomePromptItems({
    intro: expertTeam.welcomeMessage,
    guideLabel: expertTeam.name,
    guideTitle: `可处理${scenarioLabel}等场景，直接描述目标、背景和限制条件即可。`,
    guideItems: memberEmployees.map(item => `${item.name}：${item.summary}`),
    skillItems: mergedSkillItems,
    promptItems,
    caseItems: primaryConfig.caseItems,
  });
};

const resolveDialogueScenarioEmployeeId = (employee: EmployeeItem): string =>
  employee.isExpertTeam && employee.expertTeamId ? employee.expertTeamId : employee.id;

/**
 * 解析专家团对话的目标路由。
 */
const resolveExpertTeamDialogueRouting = (
  employee: EmployeeItem | null,
  content: string,
  employees: EmployeeItem[],
): ExpertTeamDialogueRouting | null => {
  if (!employee?.isExpertTeam) {
    return null;
  }

  const teamMembers = resolveExpertTeamMembers(employee, employees);
  const primaryEmployee =
    teamMembers.find(item => item.id === employee.expertTeamPrimaryMemberId) ?? teamMembers[0];

  if (!primaryEmployee) {
    return null;
  }

  if (content.includes(`@${TEAM_MENTION_ALL_LABEL}`)) {
    return {
      mode: "all",
      primaryEmployee,
      targetEmployee: primaryEmployee,
      teamMembers,
    };
  }

  const matchedMember = teamMembers.find(member => content.includes(`@${member.name}`)) ?? null;

  if (matchedMember) {
    return {
      mode: "member",
      primaryEmployee,
      targetEmployee: matchedMember,
      teamMembers,
    };
  }

  return {
    mode: "primary",
    primaryEmployee,
    targetEmployee: primaryEmployee,
    teamMembers,
  };
};

const sortConversationEmployees = (employees: EmployeeItem[]): EmployeeItem[] =>
  [...employees].sort((left, right) => {
    const leftDefaultIndex = DEFAULT_WORKSPACE_AGENT_ORDER.indexOf(left.id);
    const rightDefaultIndex = DEFAULT_WORKSPACE_AGENT_ORDER.indexOf(right.id);

    if (leftDefaultIndex !== -1 || rightDefaultIndex !== -1) {
      if (leftDefaultIndex === -1) {
        return 1;
      }
      if (rightDefaultIndex === -1) {
        return -1;
      }
      return leftDefaultIndex - rightDefaultIndex;
    }

    if (left.isExpertTeam || right.isExpertTeam) {
      if (left.isExpertTeam && !right.isExpertTeam) {
        return -1;
      }
      if (!left.isExpertTeam && right.isExpertTeam) {
        return 1;
      }
    }

    if (left.id === DEFAULT_CONVERSATION_EMPLOYEE_ID) {
      return -1;
    }
    if (right.id === DEFAULT_CONVERSATION_EMPLOYEE_ID) {
      return 1;
    }
    return 0;
  });

const getInitialActiveEmployeeId = (workspaceMode: "metaAgent" | "expertStudio"): string =>
  workspaceMode === "metaAgent" ? DEFAULT_CONVERSATION_EMPLOYEE_ID : "";

const getInitialFeishuQrCode = (): string => {
  const storedQrCode = localStorage.getItem(FEISHU_QR_CODE_STORAGE_KEY);

  if (storedQrCode) {
    return storedQrCode;
  }

  return localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true"
    ? DEFAULT_FEISHU_QR_CODE
    : "";
};

/**
 * FrontisAI Web 原型主页面
 *
 * 当前页面通过路由区分普通用户与企业老板视图。
 */
const FrontisPage = ({
  viewRole,
  embedded = false,
  resetSignal = 0,
  workspaceMode = "metaAgent",
  pendingWorkbenchConversationSessionId = null,
  onPendingWorkbenchConversationSessionConsumed,
  pendingWorkbenchAgentId = null,
  onPendingWorkbenchAgentConsumed,
  onWorkbenchConversationNavChange,
}: FrontisPageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();
  const { loginByAccountId: loginOperationsByAccountId } = useOperationsAuth();
  const [dialogueSessions, setDialogueSessions] = useState<DialogueSessionItem[]>(() =>
    buildInitialDialogueSessions(viewRole, activeIdentity?.tenantId),
  );
  const [dialogueArtifactsBySession, setDialogueArtifactsBySession] = useState<
    Record<string, ArtifactItem[]>
  >(() => buildInitialDialogueArtifacts(activeIdentity?.tenantId));
  const [dialogueResultsBySession, setDialogueResultsBySession] = useState<
    Record<string, DialogueGeneratedResultItem[]>
  >(() => buildInitialDialogueResults(activeIdentity?.tenantId));
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(() =>
    getInitialActiveEmployeeId(workspaceMode),
  );
  const [activeDialogueSessionId, setActiveDialogueSessionId] = useState<string>("");
  const [isDialogueHomeActive, setIsDialogueHomeActive] = useState<boolean>(
    () => workspaceMode === "expertStudio",
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [activeCaseReplay, setActiveCaseReplay] = useState<CaseReplayState | null>(null);
  const [dialogueInputValue, setDialogueInputValue] = useState<string>("");
  const [dialogueAttachments, setDialogueAttachments] = useState<WorkspaceComposerAttachmentItem[]>(
    [],
  );
  const [activeMetaAgentTrajectoryId, setActiveMetaAgentTrajectoryId] = useState<string | null>(
    null,
  );
  const [activeMetaAgentTrajectoryAnchorBlockId, setActiveMetaAgentTrajectoryAnchorBlockId] =
    useState<string | null>(null);
  const [respondingDialogueSessionId, setRespondingDialogueSessionId] = useState<string | null>(
    null,
  );
  const [removedExpertStudioAgentIds, setRemovedExpertStudioAgentIds] = useState<string[]>([]);
  const [isFeishuQrConfigured, setIsFeishuQrConfigured] = useState<boolean>(
    () => localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true",
  );
  const [feishuQrCode, setFeishuQrCode] = useState<string>(() => getInitialFeishuQrCode());
  const [isFeishuWorkspaceConnected, setIsFeishuWorkspaceConnected] = useState<boolean>(false);
  const dialogueTimerRefs = useRef<number[]>([]);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);
  const lastWorkbenchResetSignalRef = useRef<number>(resetSignal);
  const activeTenantId = activeIdentity?.tenantId ?? NEW_USER_ONBOARDING_TENANT_ID;
  const [agentStoreProducts, setAgentStoreProducts] = useState(() =>
    loadStoredOperationsProducts(),
  );
  const [agentStoreFulfillments, setAgentStoreFulfillments] = useState(() =>
    loadStoredOperationsFulfillments(),
  );
  const [workbenchAgentRecords, setWorkbenchAgentRecords] = useState<WorkbenchAgentRecord[]>(() =>
    loadWorkbenchAgentRecords(),
  );

  useEffect(() => {
    setDialogueSessions(buildInitialDialogueSessions(viewRole, activeIdentity?.tenantId));
    setDialogueArtifactsBySession(buildInitialDialogueArtifacts(activeIdentity?.tenantId));
    setDialogueResultsBySession(buildInitialDialogueResults(activeIdentity?.tenantId));
    setActiveDialogueSessionId("");
    setIsDialogueHomeActive(workspaceMode === "expertStudio");
    setActiveCaseReplay(null);
    setDialogueInputValue("");
    setDialogueAttachments([]);
    setActiveMetaAgentTrajectoryId(null);
    setActiveMetaAgentTrajectoryAnchorBlockId(null);
    setRemovedExpertStudioAgentIds([]);
    setIsFeishuWorkspaceConnected(false);
  }, [activeIdentity?.tenantId, viewRole, workspaceMode]);

  useEffect(() => {
    const handleFeishuQrUpdated = (event: Event): void => {
      const configured =
        event instanceof CustomEvent
          ? Boolean(event.detail?.configured)
          : localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true";
      const nextQrCode =
        event instanceof CustomEvent && typeof event.detail?.qrCode === "string"
          ? event.detail.qrCode
          : getInitialFeishuQrCode();

      setIsFeishuQrConfigured(configured);
      setFeishuQrCode(nextQrCode || (configured ? DEFAULT_FEISHU_QR_CODE : ""));
      if (!configured) {
        setIsFeishuWorkspaceConnected(false);
      }
    };

    window.addEventListener(FEISHU_QR_UPDATED_EVENT, handleFeishuQrUpdated);

    return () => {
      window.removeEventListener(FEISHU_QR_UPDATED_EVENT, handleFeishuQrUpdated);
    };
  }, []);

  useEffect(() => {
    setAgentStoreProducts(loadStoredOperationsProducts());
    setAgentStoreFulfillments(loadStoredOperationsFulfillments());
  }, [activeTenantId]);

  useEffect(() => {
    const handleWorkbenchAgentsUpdated = (): void => {
      setWorkbenchAgentRecords(loadWorkbenchAgentRecords());
    };

    window.addEventListener(WORKBENCH_AGENT_RECORDS_UPDATED_EVENT, handleWorkbenchAgentsUpdated);

    return () => {
      window.removeEventListener(
        WORKBENCH_AGENT_RECORDS_UPDATED_EVENT,
        handleWorkbenchAgentsUpdated,
      );
    };
  }, []);

  const latestAgentStoreFulfillmentsByProductId = useMemo(
    () => resolveLatestFulfillmentsByProductId(activeTenantId, agentStoreFulfillments),
    [activeTenantId, agentStoreFulfillments],
  );
  const directAddableAgentStoreItems = useMemo(
    () =>
      buildFrontisAgents(
        agentStoreProducts,
        activeTenantId,
        latestAgentStoreFulfillmentsByProductId,
      ).filter(agent => !shouldContactForAgent(agent)),
    [activeTenantId, agentStoreProducts, latestAgentStoreFulfillmentsByProductId],
  );
  const marketplaceEmployees = useMemo(
    () => directAddableAgentStoreItems.map(mapStoreAgentToEmployee),
    [directAddableAgentStoreItems],
  );
  const workbenchEmployees = useMemo(
    () => workbenchAgentRecords.map(mapWorkbenchRecordToEmployee),
    [workbenchAgentRecords],
  );
  const employees = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...INITIAL_EMPLOYEES.map(item => mapEmployeeForRole(item, viewRole)),
            ...marketplaceEmployees,
            ...workbenchEmployees,
          ].map(employee => [employee.id, employee] as const),
        ).values(),
      ),
    [marketplaceEmployees, viewRole, workbenchEmployees],
  );
  const workspaces = useMemo(() => INITIAL_WORKSPACES, []);
  const tenantUsers = useMemo(
    () => getMockTenantUsers(activeIdentity?.tenantId) ?? INITIAL_FRONTIS_WEB_USERS,
    [activeIdentity?.tenantId],
  );
  const currentUser = useMemo(
    () =>
      tenantUsers.find(item => item.id === session?.userId) ??
      (viewRole === "admin"
        ? (tenantUsers.find(
            item => MANAGEMENT_USER_ROLES.has(item.role) && item.status === "active",
          ) ?? tenantUsers.find(item => MANAGEMENT_USER_ROLES.has(item.role)))
        : (tenantUsers.find(item => item.role !== "enterpriseAdmin" && item.status === "active") ??
          tenantUsers.find(item => item.role !== "enterpriseAdmin"))) ??
      null,
    [session?.userId, tenantUsers, viewRole],
  );
  const registrationOnboardingDraft = useMemo(() => loadRegistrationOnboardingDraft(), []);
  const shouldForceRegistrationOnboardingProfileModal = searchParams.get("from") === "register";
  const shouldEnableMeOnboardingProfileModal =
    workspaceMode === "metaAgent" &&
    activeIdentity?.platform === "enterpriseWorkspace" &&
    (isNewUserOnboardingTenant(activeIdentity?.tenantId) ||
      shouldForceRegistrationOnboardingProfileModal);
  const meOnboardingProfileModalState = useMeOnboardingProfileModal({
    enabled: shouldEnableMeOnboardingProfileModal,
    accountId: session?.accountId,
    tenantId: activeIdentity?.tenantId,
    defaultNickname: registrationOnboardingDraft?.nickname || currentUser?.name || session?.name,
    defaultCompanyName: registrationOnboardingDraft?.companyName,
    showOnEveryEntry:
      isNewUserOnboardingTenant(activeIdentity?.tenantId) ||
      shouldForceRegistrationOnboardingProfileModal,
  });
  const {
    isOpen: isMeOnboardingProfileModalOpen,
    profile: meOnboardingProfile,
    handleChangeProfile: handleChangeMeOnboardingProfile,
    handleSkipProfile: handleSkipMeOnboardingProfile,
    handleSubmitProfile: submitMeOnboardingProfile,
  } = meOnboardingProfileModalState;
  const roleVisibleEmployees = useMemo(
    () => employees.filter(item => item.portalRoles.includes(viewRole)),
    [employees, viewRole],
  );
  const workbenchAgentIds = useMemo(
    () => new Set(workbenchAgentRecords.map(record => record.id)),
    [workbenchAgentRecords],
  );
  const assignedConversationEmployees = useMemo(
    () =>
      roleVisibleEmployees.filter(item => {
        const isAssigned = workbenchAgentIds.has(item.id);

        if (!isAssigned || item.id === DEFAULT_CONVERSATION_EMPLOYEE_ID) {
          return false;
        }

        if (viewRole === "admin") {
          return true;
        }

        return (
          item.visibility === "all" ||
          (currentUser
            ? hasUserInAccessScope(
                currentUser,
                item.accessScopeSubjects,
                tenantUsers,
                INITIAL_ORGANIZATION_DEPARTMENTS,
              )
            : false)
        );
      }),
    [currentUser, roleVisibleEmployees, tenantUsers, viewRole, workbenchAgentIds],
  );
  const expertStudioAssignedEmployees = useMemo(
    () =>
      workspaceMode === "expertStudio"
        ? assignedConversationEmployees.filter(
            item => !removedExpertStudioAgentIds.includes(item.id),
          )
        : assignedConversationEmployees,
    [assignedConversationEmployees, removedExpertStudioAgentIds, workspaceMode],
  );
  const deviceDefaultAgents = useMemo(() => {
    const defaultEmployee =
      roleVisibleEmployees.find(item => item.id === DEFAULT_CONVERSATION_EMPLOYEE_ID) ??
      roleVisibleEmployees[0] ??
      null;

    if (!defaultEmployee) {
      return [];
    }

    const defaultWorkspace =
      (currentUser?.assignedWorkspaceIds ?? [])
        .map(workspaceId => workspaces.find(item => item.id === workspaceId) ?? null)
        .find((item): item is WorkspaceItem => item !== null) ??
      workspaces.find(item => item.id === defaultEmployee.workspaceId) ??
      workspaces[0] ??
      null;

    const defaultAgent = buildWorkspaceDefaultAgent(
      defaultEmployee,
      defaultWorkspace,
      assignedConversationEmployees,
      currentUser?.id,
      currentUser?.name,
    );

    return defaultAgent ? [defaultAgent] : [];
  }, [
    currentUser?.assignedWorkspaceIds,
    currentUser?.id,
    currentUser?.name,
    assignedConversationEmployees,
    roleVisibleEmployees,
    workspaces,
  ]);
  const conversationEmployeeDirectory = useMemo(() => {
    const mergedEmployees =
      workspaceMode === "metaAgent"
        ? [...deviceDefaultAgents, ...assignedConversationEmployees]
        : [...deviceDefaultAgents, ...expertStudioAssignedEmployees];

    return mergedEmployees.filter(
      (item, index) => mergedEmployees.findIndex(candidate => candidate.id === item.id) === index,
    );
  }, [
    assignedConversationEmployees,
    deviceDefaultAgents,
    expertStudioAssignedEmployees,
    workspaceMode,
  ]);
  const visibleConversationEmployees = useMemo(
    () => (workspaceMode === "metaAgent" ? deviceDefaultAgents : conversationEmployeeDirectory),
    [conversationEmployeeDirectory, deviceDefaultAgents, workspaceMode],
  );
  const conversationEmployees = useMemo(
    () => sortConversationEmployees(visibleConversationEmployees),
    [visibleConversationEmployees],
  );
  const activeEmployee = useMemo(
    () =>
      conversationEmployees.find(item => item.id === activeEmployeeId) ??
      conversationEmployees[0] ??
      null,
    [activeEmployeeId, conversationEmployees],
  );
  const activeExpertTeamMembers = useMemo(
    () => resolveExpertTeamMembers(activeEmployee, conversationEmployeeDirectory),
    [activeEmployee, conversationEmployeeDirectory],
  );
  const isMetaAgentDialogue = useMemo(() => isMetaAgentEmployee(activeEmployee), [activeEmployee]);
  const shouldShowFeishuConnectAction = workspaceMode === "metaAgent" && isFeishuQrConfigured;

  const employeeDialogueSessions = useMemo(
    () =>
      activeEmployee ? dialogueSessions.filter(item => item.employeeId === activeEmployee.id) : [],
    [activeEmployee, dialogueSessions],
  );

  const activeDialogueSession = useMemo(() => {
    if (activeCaseReplay) {
      return activeCaseReplay.session;
    }
    if (isDialogueHomeActive) {
      return null;
    }

    if (workspaceMode === "expertStudio") {
      return activeDialogueSessionId
        ? (employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ?? null)
        : null;
    }

    return (
      employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ??
      employeeDialogueSessions[0] ??
      null
    );
  }, [
    activeCaseReplay,
    activeDialogueSessionId,
    employeeDialogueSessions,
    isDialogueHomeActive,
    workspaceMode,
  ]);
  const dialogueMessages = useMemo(
    () => activeDialogueSession?.messages ?? [],
    [activeDialogueSession],
  );
  const activeDialogueArtifacts = useMemo(
    () =>
      activeCaseReplay
        ? activeCaseReplay.artifacts
        : activeDialogueSession
          ? (dialogueArtifactsBySession[activeDialogueSession.id] ?? [])
          : [],
    [activeCaseReplay, activeDialogueSession, dialogueArtifactsBySession],
  );
  const activeDialogueResults = useMemo(
    () =>
      activeCaseReplay
        ? activeCaseReplay.results
        : activeDialogueSession
          ? (dialogueResultsBySession[activeDialogueSession.id] ?? [])
          : [],
    [activeCaseReplay, activeDialogueSession, dialogueResultsBySession],
  );
  const metaAgentTrajectoryItems = useMemo<MetaAgentWorkTrajectoryItem[]>(
    () =>
      buildMetaAgentWorkTrajectoryItems(
        isMetaAgentDialogue ? activeDialogueSession : null,
        activeDialogueArtifacts,
        activeDialogueResults,
      ),
    [activeDialogueArtifacts, activeDialogueResults, activeDialogueSession, isMetaAgentDialogue],
  );
  const activeMetaAgentTrajectory = useMemo(
    () => metaAgentTrajectoryItems.find(item => item.id === activeMetaAgentTrajectoryId) ?? null,
    [activeMetaAgentTrajectoryId, metaAgentTrajectoryItems],
  );
  const isDialogueResponding = activeCaseReplay
    ? false
    : activeDialogueSession?.id === respondingDialogueSessionId;
  const activeAgentHomeConfig = useMemo(() => {
    if (!activeEmployee) {
      return resolveRoleAwareHomeConfig("employee-writer", AI_CEO_DEFAULT_HOME_CONFIG, viewRole);
    }

    if (isMetaAgentEmployee(activeEmployee)) {
      const primaryConfig = resolveRoleAwareHomeConfig(
        DEFAULT_CONVERSATION_EMPLOYEE_ID,
        AI_CEO_AGENT_HOME_CONFIGS[DEFAULT_CONVERSATION_EMPLOYEE_ID] ?? AI_CEO_DEFAULT_HOME_CONFIG,
        viewRole,
      );

      return buildMetaAgentHomeConfig(activeExpertTeamMembers, primaryConfig);
    }

    if (activeEmployee.isExpertTeam) {
      return buildExpertTeamHomeConfig(activeEmployee, activeExpertTeamMembers, viewRole);
    }

    return resolveRoleAwareHomeConfig(
      activeEmployee.id,
      AI_CEO_AGENT_HOME_CONFIGS[activeEmployee.id] ?? AI_CEO_DEFAULT_HOME_CONFIG,
      viewRole,
    );
  }, [activeEmployee, activeExpertTeamMembers, viewRole]);
  const selectedSkills = useMemo(
    () => activeAgentHomeConfig.skillItems.filter(item => selectedSkillIds.includes(item.id)),
    [activeAgentHomeConfig.skillItems, selectedSkillIds],
  );
  const isExpertTeamDialogue = Boolean(activeEmployee?.isExpertTeam);
  const effectiveSelectedSkills = useMemo(
    () => (isExpertTeamDialogue ? [] : selectedSkills),
    [isExpertTeamDialogue, selectedSkills],
  );
  const selectedSkillNamesLabel = useMemo(
    () => effectiveSelectedSkills.map(item => item.name).join("、"),
    [effectiveSelectedSkills],
  );
  const dialoguePlaceholder = "请告诉我你的需求或问题";

  useEffect(() => {
    if (workspaceMode === "metaAgent" && isMetaAgentDialogue && isDialogueHomeActive) {
      setIsDialogueHomeActive(false);
    }
  }, [isDialogueHomeActive, isMetaAgentDialogue, workspaceMode]);

  useEffect(() => {
    if (!conversationEmployees.length) {
      setActiveEmployeeId("");
      return;
    }
    if (conversationEmployees.some(item => item.id === activeEmployeeId)) {
      return;
    }
    setActiveEmployeeId(conversationEmployees[0].id);
  }, [activeEmployeeId, conversationEmployees]);

  useEffect(() => {
    if (!metaAgentTrajectoryItems.length) {
      setActiveMetaAgentTrajectoryId(null);
      setActiveMetaAgentTrajectoryAnchorBlockId(null);
      return;
    }

    if (
      activeMetaAgentTrajectoryId &&
      metaAgentTrajectoryItems.some(item => item.id === activeMetaAgentTrajectoryId)
    ) {
      return;
    }

    setActiveMetaAgentTrajectoryId(null);
    setActiveMetaAgentTrajectoryAnchorBlockId(null);
  }, [activeMetaAgentTrajectoryId, metaAgentTrajectoryItems]);

  useEffect(() => {
    setActiveEmployeeId(currentId => {
      if (workspaceMode === "metaAgent") {
        return DEFAULT_CONVERSATION_EMPLOYEE_ID;
      }

      if (currentId && conversationEmployees.some(item => item.id === currentId)) {
        return currentId;
      }

      return conversationEmployees[0]?.id ?? "";
    });
  }, [conversationEmployees, workspaceMode]);

  useEffect(() => {
    if (workspaceMode !== "expertStudio") {
      lastWorkbenchResetSignalRef.current = resetSignal;
      return;
    }

    if (lastWorkbenchResetSignalRef.current === resetSignal) {
      return;
    }

    lastWorkbenchResetSignalRef.current = resetSignal;
    setActiveEmployeeId(
      conversationEmployees.some(item => item.id === DEFAULT_CONVERSATION_EMPLOYEE_ID)
        ? DEFAULT_CONVERSATION_EMPLOYEE_ID
        : (conversationEmployees[0]?.id ?? ""),
    );
    setActiveCaseReplay(null);
    setActiveMetaAgentTrajectoryId(null);
    setActiveMetaAgentTrajectoryAnchorBlockId(null);
    setIsDialogueHomeActive(true);
    setActiveDialogueSessionId("");
    setDialogueAttachments(currentAttachments => {
      currentAttachments.forEach(revokeComposerAttachmentPreview);
      return [];
    });
    setDialogueInputValue("");
    setSelectedSkillIds([]);
  }, [conversationEmployees, resetSignal, workspaceMode]);

  useEffect(() => {
    if (isDialogueHomeActive) {
      if (activeDialogueSessionId !== "") {
        setActiveDialogueSessionId("");
      }
      return;
    }

    if (workspaceMode === "expertStudio") {
      if (
        activeDialogueSessionId &&
        employeeDialogueSessions.some(item => item.id === activeDialogueSessionId)
      ) {
        return;
      }

      setActiveDialogueSessionId("");
      setIsDialogueHomeActive(true);
      return;
    }

    if (!employeeDialogueSessions.length) {
      if (activeDialogueSessionId !== "") {
        setActiveDialogueSessionId("");
      }
      return;
    }
    if (employeeDialogueSessions.some(item => item.id === activeDialogueSessionId)) {
      return;
    }
    setActiveDialogueSessionId(employeeDialogueSessions[0].id);
  }, [activeDialogueSessionId, employeeDialogueSessions, isDialogueHomeActive, workspaceMode]);

  useEffect(() => {
    latestDialogueAttachmentsRef.current = dialogueAttachments;
  }, [dialogueAttachments]);

  useEffect(() => {
    if (isExpertTeamDialogue && selectedSkillIds.length) {
      setSelectedSkillIds([]);
      return;
    }

    if (!selectedSkillIds.length) {
      return;
    }
    const nextSelectedSkillIds = selectedSkillIds.filter(skillId =>
      activeAgentHomeConfig.skillItems.some(item => item.id === skillId),
    );

    if (nextSelectedSkillIds.length === selectedSkillIds.length) {
      return;
    }
    setSelectedSkillIds(nextSelectedSkillIds);
  }, [activeAgentHomeConfig.skillItems, isExpertTeamDialogue, selectedSkillIds]);

  const clearDialogueTimers = useCallback((): void => {
    dialogueTimerRefs.current.forEach(timerId => window.clearTimeout(timerId));
    dialogueTimerRefs.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearDialogueTimers();
      latestDialogueAttachmentsRef.current.forEach(revokeComposerAttachmentPreview);
    };
  }, [clearDialogueTimers]);

  const buildAllowedComposerAttachments = useCallback(
    (files?: FileList | File[] | null): WorkspaceComposerAttachmentItem[] =>
      Array.from(files ?? []).reduce<WorkspaceComposerAttachmentItem[]>((result, file) => {
        if (!isChatAttachmentFileAllowed(file)) {
          return result;
        }
        result.push(createComposerAttachment(file));
        return result;
      }, []),
    [],
  );

  const handleDialogueAttachmentsSelected = useCallback(
    (files?: FileList | File[] | null): void => {
      const nextAttachments = buildAllowedComposerAttachments(files);
      if (!nextAttachments.length) return;
      setDialogueAttachments(prev => [...prev, ...nextAttachments]);
    },
    [buildAllowedComposerAttachments],
  );

  const handleRemoveDialogueAttachment = useCallback((attachmentUid: string): void => {
    setDialogueAttachments(prev => {
      const target = prev.find(item => item.uid === attachmentUid);
      if (target) {
        revokeComposerAttachmentPreview(target);
      }
      return prev.filter(item => item.uid !== attachmentUid);
    });
  }, []);

  const handleSelectEmployee = useCallback(
    (employeeId: string): void => {
      setActiveCaseReplay(null);
      setActiveMetaAgentTrajectoryId(null);
      setActiveEmployeeId(employeeId);
      const nextEmployee =
        conversationEmployeeDirectory.find(item => item.id === employeeId) ?? null;
      const nextEmployeeSessions = dialogueSessions.filter(item => item.employeeId === employeeId);
      const nextIsMetaAgent = isMetaAgentEmployee(nextEmployee);
      const nextHomeActive =
        workspaceMode === "expertStudio" ? true : nextIsMetaAgent ? false : isDialogueHomeActive;
      setIsDialogueHomeActive(nextHomeActive);
      setActiveDialogueSessionId(nextHomeActive ? "" : (nextEmployeeSessions[0]?.id ?? ""));
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
    },
    [
      conversationEmployeeDirectory,
      dialogueAttachments,
      dialogueSessions,
      isDialogueHomeActive,
      workspaceMode,
    ],
  );

  const handleRemoveExpertStudioAgent = useCallback(
    (employeeId: string): void => {
      if (workspaceMode !== "expertStudio") {
        return;
      }

      const targetEmployee = conversationEmployees.find(item => item.id === employeeId);
      if (!targetEmployee) {
        return;
      }

      if (employeeId === DEFAULT_CONVERSATION_EMPLOYEE_ID) {
        message.warning("ME 是新任务默认入口，不能移除。");
        return;
      }

      if (conversationEmployees.length <= 1) {
        message.warning("新任务至少保留一个可调度 AI 专家。");
        return;
      }

      const nextEmployee = conversationEmployees.find(item => item.id !== employeeId) ?? null;

      setRemovedExpertStudioAgentIds(currentIds =>
        currentIds.includes(employeeId) ? currentIds : [...currentIds, employeeId],
      );
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
      setActiveCaseReplay(null);
      setActiveMetaAgentTrajectoryId(null);

      if (activeEmployeeId === employeeId) {
        setActiveEmployeeId(nextEmployee?.id ?? "");
        setActiveDialogueSessionId(
          nextEmployee
            ? (dialogueSessions.find(item => item.employeeId === nextEmployee.id)?.id ?? "")
            : "",
        );
        setIsDialogueHomeActive(false);
      }

      message.success(`${targetEmployee.name} 已从新任务可调度专家中移除。`);
    },
    [activeEmployeeId, conversationEmployees, dialogueSessions, workspaceMode],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      const targetSession = dialogueSessions.find(item => item.id === sessionId);

      if (targetSession?.employeeId && targetSession.employeeId !== activeEmployeeId) {
        setActiveEmployeeId(targetSession.employeeId);
      }

      setActiveCaseReplay(null);
      setActiveMetaAgentTrajectoryId(null);
      setIsDialogueHomeActive(false);
      setActiveDialogueSessionId(sessionId);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
    },
    [activeEmployeeId, dialogueAttachments, dialogueSessions],
  );

  const handleCreateDialogueSession = useCallback((): void => {
    if (workspaceMode === "metaAgent" && isMetaAgentDialogue) {
      setActiveCaseReplay(null);
      setActiveMetaAgentTrajectoryId(null);
      setIsDialogueHomeActive(false);
      setActiveDialogueSessionId(
        employeeDialogueSessions[0]?.id ?? META_AGENT_PRIMARY_SEED_SESSION_ID,
      );
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
      return;
    }

    setActiveCaseReplay(null);
    setActiveMetaAgentTrajectoryId(null);
    setIsDialogueHomeActive(true);
    setActiveDialogueSessionId("");
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setDialogueInputValue("");
    setSelectedSkillIds([]);
  }, [dialogueAttachments, employeeDialogueSessions, isMetaAgentDialogue, workspaceMode]);

  useEffect(() => {
    if (!pendingWorkbenchConversationSessionId || workspaceMode !== "expertStudio") {
      return;
    }

    handleSelectDialogueSession(pendingWorkbenchConversationSessionId);
    onPendingWorkbenchConversationSessionConsumed?.();
  }, [
    handleSelectDialogueSession,
    onPendingWorkbenchConversationSessionConsumed,
    pendingWorkbenchConversationSessionId,
    workspaceMode,
  ]);

  useEffect(() => {
    if (!pendingWorkbenchAgentId || workspaceMode !== "expertStudio") {
      return;
    }

    const targetEmployee = conversationEmployees.find(item => item.id === pendingWorkbenchAgentId);
    if (!targetEmployee) {
      return;
    }

    setActiveEmployeeId(targetEmployee.id);
    setIsDialogueHomeActive(true);
    setActiveDialogueSessionId("");
    setActiveCaseReplay(null);
    setActiveMetaAgentTrajectoryId(null);
    setActiveMetaAgentTrajectoryAnchorBlockId(null);
    setDialogueInputValue("");
    setSelectedSkillIds([]);
    setDialogueAttachments(currentAttachments => {
      currentAttachments.forEach(revokeComposerAttachmentPreview);
      return [];
    });
    onPendingWorkbenchAgentConsumed?.();
  }, [
    conversationEmployees,
    onPendingWorkbenchAgentConsumed,
    pendingWorkbenchAgentId,
    workspaceMode,
  ]);

  const workbenchConversationNavGroups = useMemo<WorkbenchConversationNavGroup[]>(() => {
    const employeeMap = new Map(conversationEmployees.map(employee => [employee.id, employee]));
    const sessionsByEmployee = new Map<string, DialogueSessionItem[]>();

    dialogueSessions.forEach(session => {
      if (!employeeMap.has(session.employeeId)) {
        return;
      }

      const employeeSessions = sessionsByEmployee.get(session.employeeId) ?? [];
      employeeSessions.push(session);
      sessionsByEmployee.set(session.employeeId, employeeSessions);
    });

    return conversationEmployees
      .map(employee => ({
        employeeId: employee.id,
        employeeName: employee.name,
        sessions: (sessionsByEmployee.get(employee.id) ?? []).map(session => ({
          id: session.id,
          title: session.title,
          updatedAt: session.updatedAt,
          active: !isDialogueHomeActive && session.id === activeDialogueSession?.id,
        })),
      }))
      .filter(group => group.sessions.length > 0);
  }, [activeDialogueSession?.id, conversationEmployees, dialogueSessions, isDialogueHomeActive]);

  const handleSelectSkill = useCallback((skillId: string): void => {
    setSelectedSkillIds(current =>
      current.includes(skillId) ? current.filter(item => item !== skillId) : [...current, skillId],
    );
  }, []);

  const handleSubmitMeOnboardingProfile = useCallback((): void => {
    submitMeOnboardingProfile();
    if (shouldForceRegistrationOnboardingProfileModal) {
      clearRegistrationOnboardingDraft();
      navigate(location.pathname, { replace: true });
    }
    message.success("ME 已记住你的基础信息。");
  }, [
    location.pathname,
    navigate,
    shouldForceRegistrationOnboardingProfileModal,
    submitMeOnboardingProfile,
  ]);

  const handleRenameDialogueSession = useCallback((sessionId: string, title: string): void => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setDialogueSessions(prev =>
      prev.map(item => (item.id === sessionId ? { ...item, title: nextTitle } : item)),
    );
  }, []);

  const handleRemoveDialogueSession = useCallback(
    (sessionId: string): void => {
      const targetSession = dialogueSessions.find(item => item.id === sessionId);
      if (!targetSession) return;

      const nextSessions = dialogueSessions.filter(item => item.id !== sessionId);
      setDialogueSessions(nextSessions);
      setDialogueArtifactsBySession(prev => {
        const nextArtifacts = { ...prev };
        delete nextArtifacts[sessionId];
        return nextArtifacts;
      });
      setDialogueResultsBySession(prev => {
        const nextResults = { ...prev };
        delete nextResults[sessionId];
        return nextResults;
      });

      if (activeDialogueSessionId !== sessionId) {
        return;
      }

      const nextEmployeeSessions = nextSessions.filter(
        item => item.employeeId === targetSession.employeeId,
      );
      setActiveDialogueSessionId(nextEmployeeSessions[0]?.id ?? "");
    },
    [activeDialogueSessionId, dialogueSessions],
  );

  useEffect(() => {
    if (!onWorkbenchConversationNavChange) {
      return;
    }

    if (!embedded || workspaceMode !== "expertStudio") {
      onWorkbenchConversationNavChange(null);
      return;
    }

    onWorkbenchConversationNavChange({
      groups: workbenchConversationNavGroups,
      onRemoveSession: handleRemoveDialogueSession,
      onRenameSession: handleRenameDialogueSession,
      onSelectSession: handleSelectDialogueSession,
    });
  }, [
    embedded,
    handleRemoveDialogueSession,
    handleRenameDialogueSession,
    handleSelectDialogueSession,
    onWorkbenchConversationNavChange,
    workbenchConversationNavGroups,
    workspaceMode,
  ]);

  const updateDialogueSession = useCallback(
    (sessionId: string, updater: (session: DialogueSessionItem) => DialogueSessionItem): void => {
      setDialogueSessions(prev => {
        const currentSession = prev.find(item => item.id === sessionId);
        if (!currentSession) {
          return prev;
        }

        const nextSession = updater(currentSession);
        return [nextSession, ...prev.filter(item => item.id !== sessionId)];
      });
    },
    [],
  );

  const commitDialogue = useCallback(
    (rawInput: string, createNewSession = false): void => {
      if (!activeEmployee) return;
      const content = rawInput.trim();
      if (!content && dialogueAttachments.length === 0) return;
      const teamRouting = resolveExpertTeamDialogueRouting(
        activeEmployee,
        content,
        conversationEmployeeDirectory,
      );
      const respondingEmployee = teamRouting?.targetEmployee ?? activeEmployee;
      const collaborativeMembers =
        teamRouting?.mode === "all"
          ? teamRouting.teamMembers.filter(item => item.id !== teamRouting.primaryEmployee.id)
          : [];
      const collaborativeMemberNamesLabel = collaborativeMembers.length
        ? collaborativeMembers.map(item => item.name).join("、")
        : "当前可用专家";

      const fallbackContent = "已发送附件，请结合文件内容继续处理。";
      const normalizedScenarioQuestion = content
        .replace(/(^|[\s\n])@[^\s@]+/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
      const scenarioQuestion = normalizedScenarioQuestion || fallbackContent;
      const isSingleThreadMetaAgentDialogue = isMetaAgentEmployee(activeEmployee);
      const exactTeamScenario =
        activeEmployee.isExpertTeam && !isSingleThreadMetaAgentDialogue
          ? findDialogueScenario(
              resolveDialogueScenarioEmployeeId(activeEmployee),
              scenarioQuestion,
              createId("dialogue-scenario"),
            )
          : null;
      const matchedScenario =
        exactTeamScenario ??
        findDialogueScenario(
          respondingEmployee.id,
          scenarioQuestion,
          createId("dialogue-scenario"),
        );
      const targetSessionId = isSingleThreadMetaAgentDialogue
        ? (employeeDialogueSessions[0]?.id ?? META_AGENT_PRIMARY_SEED_SESSION_ID)
        : !createNewSession && activeDialogueSession?.id
          ? activeDialogueSession.id
          : createId("dialogue-session");
      const nextSessionTitle = isSingleThreadMetaAgentDialogue
        ? "ME 持续对话"
        : (matchedScenario?.title ??
          (content.length > 0
            ? content.slice(0, 18)
            : (dialogueAttachments[0]?.name ??
              (effectiveSelectedSkills.length
                ? `${effectiveSelectedSkills[0]?.name ?? "技能"}需求`
                : "新对话"))));
      const messageAttachments =
        dialogueAttachments.length > 0 ? dialogueAttachments.map(buildAttachmentItem) : undefined;
      const userMessageContent = effectiveSelectedSkills.length
        ? `技能：${selectedSkillNamesLabel}\n需求：${content || fallbackContent}`
        : content || fallbackContent;
      const sessionPreview = effectiveSelectedSkills.length
        ? `${selectedSkillNamesLabel} · ${content || fallbackContent}`
        : content || fallbackContent;

      const nextUserMessage = {
        id: createId("dialogue"),
        role: "user" as const,
        author: "你",
        content: userMessageContent,
        timeLabel: "刚刚",
        attachments: messageAttachments,
      };

      setDialogueSessions(prev => {
        const hasTargetSession = prev.some(item => item.id === targetSessionId);
        if (!hasTargetSession) {
          return [
            {
              id: targetSessionId,
              employeeId: activeEmployee.id,
              title: nextSessionTitle,
              preview: sessionPreview,
              updatedAt: "刚刚",
              messages: [nextUserMessage],
            },
            ...prev,
          ];
        }

        const currentSession = prev.find(item => item.id === targetSessionId);
        if (!currentSession) {
          return prev;
        }

        const nextSession: DialogueSessionItem = {
          ...currentSession,
          title: currentSession.messages.length === 0 ? nextSessionTitle : currentSession.title,
          preview: sessionPreview,
          updatedAt: "刚刚",
          messages: [...currentSession.messages, nextUserMessage],
        };
        return [nextSession, ...prev.filter(item => item.id !== targetSessionId)];
      });

      setActiveCaseReplay(null);
      setActiveMetaAgentTrajectoryId(null);
      setActiveDialogueSessionId(targetSessionId);
      setIsDialogueHomeActive(false);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setRespondingDialogueSessionId(targetSessionId);
      clearDialogueTimers();

      if (matchedScenario) {
        const [firstFrame, ...remainingFrames] = matchedScenario.frames;
        const scenarioMessageIdMap = new Map<string, string>();

        if (!firstFrame) {
          setRespondingDialogueSessionId(null);
          return;
        }

        const applyScenarioFrameToSession = (
          currentSession: DialogueSessionItem,
          frame: DialogueScenarioFrame,
        ): DialogueSessionItem => {
          const frameMessages = resolveScenarioFrameMessages(frame, respondingEmployee.name);
          const nextMessages = [...currentSession.messages];

          frameMessages.forEach(frameMessage => {
            const actualMessageId =
              scenarioMessageIdMap.get(frameMessage.key) ?? createId("dialogue");

            if (!scenarioMessageIdMap.has(frameMessage.key)) {
              scenarioMessageIdMap.set(frameMessage.key, actualMessageId);
            }

            const nextMessage = {
              id: actualMessageId,
              role: "assistant" as const,
              author: frameMessage.author?.trim() || respondingEmployee.name,
              content: frameMessage.preview,
              timeLabel: "刚刚",
              blocks: frameMessage.blocks,
              followupSuggestions: frameMessage.followupSuggestions,
            };
            const targetIndex = nextMessages.findIndex(message => message.id === actualMessageId);

            if (targetIndex >= 0) {
              nextMessages[targetIndex] = {
                ...nextMessages[targetIndex],
                ...nextMessage,
              };
              return;
            }

            nextMessages.push(nextMessage);
          });

          return {
            ...currentSession,
            preview: frame.preview,
            updatedAt: "刚刚",
            messages: nextMessages,
          };
        };

        setDialogueArtifactsBySession(prev => ({
          ...prev,
          [targetSessionId]: [],
        }));
        setDialogueResultsBySession(prev => ({
          ...prev,
          [targetSessionId]: [],
        }));
        setDialogueArtifactsBySession(prev => {
          if (!firstFrame.artifacts) {
            return prev;
          }
          return {
            ...prev,
            [targetSessionId]: firstFrame.artifacts,
          };
        });
        setDialogueResultsBySession(prev => {
          const nextResults = buildLiveDialogueResults(targetSessionId, firstFrame);
          if (!nextResults.length) {
            return prev;
          }
          return {
            ...prev,
            [targetSessionId]: nextResults,
          };
        });

        updateDialogueSession(targetSessionId, currentSession => ({
          ...applyScenarioFrameToSession(currentSession, firstFrame),
        }));

        if (remainingFrames.length === 0) {
          setRespondingDialogueSessionId(null);
          return;
        }

        let accumulatedDelayMs = 0;

        remainingFrames.forEach((frame, frameIndex) => {
          accumulatedDelayMs += frame.delayMs;
          const isLastFrame = frameIndex === remainingFrames.length - 1;
          const timerId = window.setTimeout(() => {
            updateDialogueSession(targetSessionId, currentSession =>
              applyScenarioFrameToSession(currentSession, frame),
            );

            if (frame.artifacts) {
              setDialogueArtifactsBySession(prev => ({
                ...prev,
                [targetSessionId]: frame.artifacts ?? [],
              }));
            }

            if (frame.results) {
              const nextResults = buildLiveDialogueResults(targetSessionId, frame);
              setDialogueResultsBySession(prev => ({
                ...prev,
                [targetSessionId]: nextResults,
              }));
            } else if (frame.panel?.kind === "dispatchExecution") {
              const nextResults = buildLiveDialogueResults(targetSessionId, frame);
              setDialogueResultsBySession(prev => ({
                ...prev,
                [targetSessionId]: nextResults,
              }));
            }

            dialogueTimerRefs.current = dialogueTimerRefs.current.filter(
              currentTimerId => currentTimerId !== timerId,
            );

            if (isLastFrame) {
              setRespondingDialogueSessionId(current =>
                current === targetSessionId ? null : current,
              );
            }
          }, accumulatedDelayMs);

          dialogueTimerRefs.current.push(timerId);
        });

        return;
      }

      const responseText =
        teamRouting?.mode === "all"
          ? `${teamRouting.primaryEmployee.name} 已召集 ${collaborativeMemberNamesLabel} 协同处理，我会先汇总每位专家的判断，再给你最终结论。`
          : selectedSkills.length
            ? `已按「${selectedSkillNamesLabel}」开始处理，我会先聚焦这些技能来回应你的需求。`
            : activeEmployee.isExpertTeam
              ? `${EXPERT_TEAM_MAIN_AGENT_NAME} 已接管本轮任务，如有需要会继续调度专家团其他成员协作。`
              : "已继续处理当前任务，结果会直接回流到本轮对话和右侧成果面板；如需管理员或其他角色协同，我会同步提醒。";

      const timerId = window.setTimeout(() => {
        const nextAssistantMessages =
          teamRouting?.mode === "all"
            ? [
                ...collaborativeMembers.slice(0, 3).map(member => ({
                  id: createId("dialogue"),
                  role: "assistant" as const,
                  author: member.name,
                  content: `${member.name} 已接入协作，当前会从 ${member.summary} 视角补充判断和建议。`,
                  timeLabel: "刚刚",
                })),
                {
                  id: createId("dialogue"),
                  role: "assistant" as const,
                  author: teamRouting.primaryEmployee.name,
                  content: `${responseText} 同时我会把相关事项同步到当前会话和定时任务页，方便继续追踪。`,
                  timeLabel: "刚刚",
                },
              ]
            : [
                {
                  id: createId("dialogue"),
                  role: "assistant" as const,
                  author: respondingEmployee.name,
                  content: `${responseText} 同时我会把相关事项同步到当前会话和定时任务页，方便继续追踪。`,
                  timeLabel: "刚刚",
                },
              ];
        setDialogueSessions(prev => {
          const currentSession = prev.find(item => item.id === targetSessionId);
          if (!currentSession) {
            return prev;
          }
          const nextSession: DialogueSessionItem = {
            ...currentSession,
            preview:
              nextAssistantMessages[nextAssistantMessages.length - 1]?.content ??
              currentSession.preview,
            updatedAt: "刚刚",
            messages: [...currentSession.messages, ...nextAssistantMessages],
          };
          return [nextSession, ...prev.filter(item => item.id !== targetSessionId)];
        });
        setRespondingDialogueSessionId(current => (current === targetSessionId ? null : current));
        dialogueTimerRefs.current = dialogueTimerRefs.current.filter(
          currentTimerId => currentTimerId !== timerId,
        );
      }, 1200);
      dialogueTimerRefs.current.push(timerId);
    },
    [
      activeDialogueSession,
      activeEmployee,
      clearDialogueTimers,
      conversationEmployeeDirectory,
      dialogueAttachments,
      employeeDialogueSessions,
      effectiveSelectedSkills,
      selectedSkillNamesLabel,
      selectedSkills.length,
      updateDialogueSession,
    ],
  );

  const handleSendDialogue = useCallback((): void => {
    commitDialogue(dialogueInputValue);
  }, [commitDialogue, dialogueInputValue]);

  const handleSelectMetaAgentTrajectory = useCallback(
    (trajectoryId: string, anchorBlockId?: string): void => {
      setActiveMetaAgentTrajectoryId(trajectoryId);
      setActiveMetaAgentTrajectoryAnchorBlockId(anchorBlockId ?? null);
    },
    [],
  );

  const handleClearMetaAgentTrajectory = useCallback((): void => {
    setActiveMetaAgentTrajectoryId(null);
    setActiveMetaAgentTrajectoryAnchorBlockId(null);
  }, []);

  const handleConnectFeishu = useCallback((): void => {
    if (!isFeishuQrConfigured) {
      return;
    }

    setIsFeishuWorkspaceConnected(true);
    message.success("飞书已连接。");
  }, [isFeishuQrConfigured]);

  const handleOpenHomeCase = useCallback(
    (item: AiCeoHomeCaseItem): void => {
      if (!activeEmployee) {
        return;
      }
      const replayEmployee = activeEmployee.isExpertTeam
        ? (activeExpertTeamMembers.find(
            member => member.id === activeEmployee.expertTeamPrimaryMemberId,
          ) ??
          activeExpertTeamMembers[0] ??
          activeEmployee)
        : activeEmployee;
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
      setActiveDialogueSessionId("");
      setIsDialogueHomeActive(false);
      setActiveCaseReplay(buildCaseReplayState(replayEmployee, item, viewRole));
    },
    [activeEmployee, activeExpertTeamMembers, dialogueAttachments, viewRole],
  );

  const handleStartCasePractice = useCallback((): void => {
    if (!activeCaseReplay) {
      return;
    }
    commitDialogue(activeCaseReplay.practiceQuestion, true);
  }, [activeCaseReplay, commitDialogue]);

  const handleSendDialogueQuickPrompt = useCallback(
    (question: string): void => {
      if (isDialogueResponding) {
        return;
      }

      commitDialogue(question);
    },
    [commitDialogue, isDialogueResponding],
  );

  const handleStopDialogue = useCallback((): void => {
    if (!isDialogueResponding || !activeDialogueSession) return;
    clearDialogueTimers();
    setRespondingDialogueSessionId(null);
    setDialogueSessions(prev => {
      const currentSession = prev.find(item => item.id === activeDialogueSession.id);
      if (!currentSession) {
        return prev;
      }
      const nextSession: DialogueSessionItem = {
        ...currentSession,
        preview: "本轮对话已被手动终止。",
        updatedAt: "刚刚",
        messages: [
          ...currentSession.messages,
          {
            id: createId("dialogue"),
            role: "system",
            author: "系统",
            content: "本轮对话已被手动终止。你可以继续补充信息后重新发送。",
            timeLabel: "刚刚",
          },
        ],
      };
      return [nextSession, ...prev.filter(item => item.id !== activeDialogueSession.id)];
    });
  }, [activeDialogueSession, clearDialogueTimers, isDialogueResponding]);

  const handleLogout = useCallback((): void => {
    const redirectPath = `${location.pathname}${location.search}`;

    logout();
    message.success("已退出模拟登录。");
    navigate(getLoginPath(redirectPath), { replace: true });
  }, [location.pathname, location.search, logout, navigate]);

  const systemEntries = useMemo(
    () =>
      getSystemEntries(
        session?.identities ?? [],
        activeIdentity?.tenantId,
        session?.activeIdentityId,
      ),
    [activeIdentity?.tenantId, session?.activeIdentityId, session?.identities],
  );
  const tenantEntries = useMemo(
    () => getTenantEntries(session?.identities ?? [], activeIdentity?.tenantId),
    [activeIdentity?.tenantId, session?.identities],
  );
  const isAdminIdentity = activeIdentity?.role === "admin" || session?.role === "admin";
  const handleOpenSystemEntry = useCallback(
    (entry: MockAuthSystemEntry): void => {
      if (entry.platform === "operationsAdmin" && entry.operationsAccountId) {
        const identityResult = activateIdentity(entry.identityId, entry.entryPath);

        if (!identityResult.success) {
          message.error(identityResult.message);
          return;
        }

        const result = loginOperationsByAccountId(entry.operationsAccountId, entry.entryPath);

        if (!result.success) {
          message.error(result.message);
          return;
        }

        navigate(result.redirectPath ?? entry.entryPath, { replace: true });
        return;
      }

      const result = activateIdentity(entry.identityId, entry.entryPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? entry.entryPath, { replace: true });
    },
    [activateIdentity, loginOperationsByAccountId, navigate],
  );
  const handleSwitchTenant = useCallback(
    (tenantId: string): void => {
      const currentPath = `${location.pathname}${location.search}`;
      const result = activateTenant(tenantId, currentPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? "/login", { replace: true });
    },
    [activateTenant, location.pathname, location.search, navigate],
  );

  const accountMenuItems: MenuProps["items"] = [
    ...(isAdminIdentity
      ? [
          {
            key: "open-admin-management",
            icon: <AppstoreOutlined />,
            label: MANAGEMENT_CONSOLE_LABEL,
            onClick: () =>
              navigate(getTenantAdminManagementPath(activeIdentity?.tenantId), { replace: true }),
          },
          {
            type: "divider" as const,
          },
        ]
      : []),
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: getSystemEntryMenuLabel(entry),
      onClick: () => handleOpenSystemEntry(entry),
    })),
    ...(systemEntries.length
      ? [
          {
            type: "divider" as const,
          },
        ]
      : []),
    ...tenantEntries.map(tenant => ({
      key: `tenant-entry-${tenant.tenantId}`,
      icon: <AppstoreOutlined />,
      label: `切换到${tenant.tenantName}`,
      onClick: () => handleSwitchTenant(tenant.tenantId),
    })),
    ...(tenantEntries.length
      ? [
          {
            type: "divider" as const,
          },
        ]
      : []),
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const renderContent = (): JSX.Element => {
    if (activeEmployee) {
      return (
        <DialoguePrototypeView
          activeEmployee={activeEmployee}
          activeDialogueArtifacts={activeDialogueArtifacts}
          activeDialogueResults={activeDialogueResults}
          activeDialogueSession={activeDialogueSession}
          allEmployees={conversationEmployees}
          conversationEmployeeDirectory={conversationEmployeeDirectory}
          activeExpertTeamMembers={activeExpertTeamMembers}
          accountMenuItems={accountMenuItems}
          dialoguePlaceholder={dialoguePlaceholder}
          dialogueAttachments={dialogueAttachments}
          dialogueInputValue={dialogueInputValue}
          dialogueMessages={dialogueMessages}
          allDialogueSessions={dialogueSessions}
          dialogueSessions={employeeDialogueSessions}
          homeSkillItems={activeAgentHomeConfig.skillItems}
          meSchedulableExperts={workbenchEmployees}
          isHomeVisible={isDialogueHomeActive}
          isDialogueResponding={isDialogueResponding}
          defaultAgentIds={
            workspaceMode === "metaAgent" ? deviceDefaultAgents.map(item => item.id) : []
          }
          showAgentSwitcher={!(embedded && workspaceMode === "expertStudio")}
          showDialogueSessionMenu={!(embedded && workspaceMode === "expertStudio")}
          onCreateDialogueSession={handleCreateDialogueSession}
          onDialogueAttachmentsSelected={handleDialogueAttachmentsSelected}
          onDialogueInputChange={setDialogueInputValue}
          onDialogueSessionSelect={handleSelectDialogueSession}
          isCaseReplayMode={Boolean(activeCaseReplay)}
          caseReplayActionLabel="立即实践"
          caseReplayOpenPanel={activeCaseReplay?.openPanel ?? null}
          onCaseReplayAction={handleStartCasePractice}
          onQuickPromptSend={handleSendDialogueQuickPrompt}
          onRemoveEmployee={
            workspaceMode === "expertStudio" ? handleRemoveExpertStudioAgent : undefined
          }
          onRemoveDialogueSession={handleRemoveDialogueSession}
          onRenameDialogueSession={handleRenameDialogueSession}
          onEmployeeSelect={handleSelectEmployee}
          onRemoveAttachment={handleRemoveDialogueAttachment}
          onSkillSelect={handleSelectSkill}
          onSendDialogue={handleSendDialogue}
          selectedSkillIds={selectedSkillIds}
          onStopDialogue={handleStopDialogue}
          hideAgentSidebar={workspaceMode === "metaAgent"}
          hideInternalSidebar={embedded && workspaceMode === "expertStudio"}
          focusBlockId={
            activeMetaAgentTrajectoryAnchorBlockId ?? activeMetaAgentTrajectory?.anchorBlockId
          }
          metaAgentTrajectoryItems={isMetaAgentDialogue ? metaAgentTrajectoryItems : []}
          activeMetaAgentTrajectory={activeMetaAgentTrajectory}
          onSelectMetaAgentTrajectory={handleSelectMetaAgentTrajectory}
          onClearMetaAgentTrajectory={handleClearMetaAgentTrajectory}
          onFeishuConnect={handleConnectFeishu}
          isFeishuConnected={isFeishuWorkspaceConnected}
          feishuQrCode={feishuQrCode}
          showFeishuConnectAction={shouldShowFeishuConnectAction}
          showAccountEntry={!embedded}
          viewerName={currentUser?.name ?? "你"}
        />
      );
    }

    return (
      <div className={styles.emptyPageState}>
        <Empty
          description={
            workspaceMode === "metaAgent"
              ? `当前账号暂未启用${MA_WORKBENCH_LABEL}，请联系管理员分配后再开始对话。`
              : `当前账号暂未分配可直接使用的 AI 专家，请先从${EXPERT_PLAZA_LABEL}添加或联系管理员分配。`
          }
        />
      </div>
    );
  };

  const meOnboardingProfileModal = (
    <MeOnboardingProfileModal
      open={isMeOnboardingProfileModalOpen}
      value={meOnboardingProfile}
      onChange={handleChangeMeOnboardingProfile}
      onSubmit={handleSubmitMeOnboardingProfile}
      onSkip={handleSkipMeOnboardingProfile}
    />
  );

  if (embedded) {
    return (
      <div className={styles.embeddedPage}>
        {renderContent()}
        {meOnboardingProfileModal}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <div className={styles.content}>{renderContent()}</div>
        </div>
      </main>
      {meOnboardingProfileModal}
    </div>
  );
};

export default FrontisPage;
