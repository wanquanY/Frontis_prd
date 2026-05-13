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
  getAgentStoreDomainTone,
  resolveLatestFulfillmentsByProductId,
  shouldContactForAgent,
  type StoreAgentItem,
} from "@/feature/fde/components/FdeAgentStoreView";
import agentStoreStyles from "@/feature/fde/components/FdeAgentStoreView.module.less";
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
  workspaceMode?: "metaAgent" | "expertStudio";
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
const META_AGENT_ADD_EXPERT_QUICK_PROMPT = "给ME添加可调度的AI专家";

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
  ];
};

const INITIAL_META_AGENT_SEED_SESSIONS = buildMetaAgentSeedSessions();
const NORMALIZED_INITIAL_DIALOGUE_SESSIONS = [
  ...INITIAL_DIALOGUE_SESSIONS.filter(item => item.employeeId !== DEFAULT_CONVERSATION_EMPLOYEE_ID),
  ...INITIAL_META_AGENT_SEED_SESSIONS,
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
      followupSuggestions: [META_AGENT_ONBOARDING_QUICK_PROMPT, META_AGENT_ADD_EXPERT_QUICK_PROMPT],
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
  lastAction: "已从 AI专家广场添加，可由 ME 调度。",
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
  expertSetupMode: "permission",
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

/**
 * FrontisAI Web 原型主页面
 *
 * 当前页面通过路由区分普通用户与企业老板视图。
 */
const FrontisPage = ({
  viewRole,
  embedded = false,
  workspaceMode = "metaAgent",
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
  const [isDialogueHomeActive, setIsDialogueHomeActive] = useState<boolean>(false);
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
  const [onboardingSchedulableAgentIds, setOnboardingSchedulableAgentIds] = useState<string[]>([]);
  const [isMeExpertPickerOpen, setIsMeExpertPickerOpen] = useState<boolean>(false);
  const dialogueTimerRefs = useRef<number[]>([]);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);
  const activeTenantId = activeIdentity?.tenantId ?? NEW_USER_ONBOARDING_TENANT_ID;
  const [agentStoreProducts, setAgentStoreProducts] = useState(() =>
    loadStoredOperationsProducts(),
  );
  const [agentStoreFulfillments, setAgentStoreFulfillments] = useState(() =>
    loadStoredOperationsFulfillments(),
  );

  useEffect(() => {
    setDialogueSessions(buildInitialDialogueSessions(viewRole, activeIdentity?.tenantId));
    setDialogueArtifactsBySession(buildInitialDialogueArtifacts(activeIdentity?.tenantId));
    setDialogueResultsBySession(buildInitialDialogueResults(activeIdentity?.tenantId));
    setActiveDialogueSessionId("");
    setIsDialogueHomeActive(false);
    setActiveCaseReplay(null);
    setDialogueInputValue("");
    setDialogueAttachments([]);
    setActiveMetaAgentTrajectoryId(null);
    setActiveMetaAgentTrajectoryAnchorBlockId(null);
    setRemovedExpertStudioAgentIds([]);
    setOnboardingSchedulableAgentIds([]);
    setIsMeExpertPickerOpen(false);
  }, [activeIdentity?.tenantId, viewRole, workspaceMode]);

  useEffect(() => {
    setAgentStoreProducts(loadStoredOperationsProducts());
    setAgentStoreFulfillments(loadStoredOperationsFulfillments());
  }, [activeTenantId]);

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
  const employees = useMemo(
    () => [
      ...INITIAL_EMPLOYEES.map(item => mapEmployeeForRole(item, viewRole)),
      ...marketplaceEmployees,
    ],
    [marketplaceEmployees, viewRole],
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
  const baseAssignedAgentIds = useMemo(
    () => (shouldEnableMeOnboardingProfileModal ? [] : (currentUser?.assignedAgentIds ?? [])),
    [currentUser?.assignedAgentIds, shouldEnableMeOnboardingProfileModal],
  );
  const assignedMeSchedulableAgentIds = useMemo(
    () => new Set([...baseAssignedAgentIds, ...onboardingSchedulableAgentIds]),
    [baseAssignedAgentIds, onboardingSchedulableAgentIds],
  );
  const assignedConversationEmployees = useMemo(
    () =>
      roleVisibleEmployees.filter(item => {
        const isAssigned = assignedMeSchedulableAgentIds.has(item.id);

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
    [assignedMeSchedulableAgentIds, currentUser, roleVisibleEmployees, tenantUsers, viewRole],
  );
  const meSchedulableExpertOptions = directAddableAgentStoreItems;
  const handleAddMeSchedulableExpert = useCallback(
    (expertId: string): void => {
      const matchedExpert = meSchedulableExpertOptions.find(item => item.id === expertId);

      setOnboardingSchedulableAgentIds(currentIds =>
        currentIds.includes(expertId) ? currentIds : [...currentIds, expertId],
      );

      if (matchedExpert) {
        message.success(`已添加「${matchedExpert.name}」到专家列表。`);
      }
    },
    [meSchedulableExpertOptions],
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
        : [...expertStudioAssignedEmployees];

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
    return (
      employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ??
      employeeDialogueSessions[0] ??
      null
    );
  }, [activeCaseReplay, activeDialogueSessionId, employeeDialogueSessions, isDialogueHomeActive]);
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
    if (isMetaAgentDialogue && isDialogueHomeActive) {
      setIsDialogueHomeActive(false);
    }
  }, [isDialogueHomeActive, isMetaAgentDialogue]);

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

      if (currentId && currentId !== DEFAULT_CONVERSATION_EMPLOYEE_ID) {
        return currentId;
      }

      return conversationEmployees[0]?.id ?? "";
    });
  }, [conversationEmployees, workspaceMode]);

  useEffect(() => {
    if (isDialogueHomeActive) {
      if (activeDialogueSessionId !== "") {
        setActiveDialogueSessionId("");
      }
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
  }, [activeDialogueSessionId, employeeDialogueSessions, isDialogueHomeActive]);

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
      const nextHomeActive = nextIsMetaAgent ? false : isDialogueHomeActive;
      setIsDialogueHomeActive(nextHomeActive);
      setActiveDialogueSessionId(nextHomeActive ? "" : (nextEmployeeSessions[0]?.id ?? ""));
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
    },
    [conversationEmployeeDirectory, dialogueAttachments, dialogueSessions, isDialogueHomeActive],
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

      if (conversationEmployees.length <= 1) {
        message.warning("ME 专家列表至少保留一个 AI 专家。");
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

      message.success(`${targetEmployee.name} 已从 ME 专家列表移除。`);
    },
    [activeEmployeeId, conversationEmployees, dialogueSessions, workspaceMode],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      setActiveCaseReplay(null);
      setActiveMetaAgentTrajectoryId(null);
      setIsDialogueHomeActive(false);
      setActiveDialogueSessionId(sessionId);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
    },
    [dialogueAttachments],
  );

  const handleCreateDialogueSession = useCallback((): void => {
    if (isMetaAgentDialogue) {
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
  }, [dialogueAttachments, employeeDialogueSessions, isMetaAgentDialogue]);

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

  const handleSendDialogueHomePrompt = useCallback(
    (question: string): void => {
      commitDialogue(question, Boolean(activeCaseReplay));
    },
    [activeCaseReplay, commitDialogue],
  );

  const handleSendDialogueQuickPrompt = useCallback(
    (question: string): void => {
      if (isDialogueResponding) {
        return;
      }

      if (question === META_AGENT_ADD_EXPERT_QUICK_PROMPT) {
        setIsMeExpertPickerOpen(true);
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

      navigate(result.redirectPath ?? "/portal", { replace: true });
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
          dialogueSessions={employeeDialogueSessions}
          homeCaseItems={activeAgentHomeConfig.caseItems}
          homePromptItems={activeAgentHomeConfig.promptItems}
          homeSkillItems={activeAgentHomeConfig.skillItems}
          isHomeVisible={isDialogueHomeActive}
          isDialogueResponding={isDialogueResponding}
          defaultAgentIds={
            workspaceMode === "metaAgent" ? deviceDefaultAgents.map(item => item.id) : []
          }
          onCreateDialogueSession={handleCreateDialogueSession}
          onDialogueAttachmentsSelected={handleDialogueAttachmentsSelected}
          onDialogueInputChange={setDialogueInputValue}
          onDialogueSessionSelect={handleSelectDialogueSession}
          isCaseReplayMode={Boolean(activeCaseReplay)}
          caseReplayActionLabel="立即实践"
          caseReplayOpenPanel={activeCaseReplay?.openPanel ?? null}
          onCaseReplayAction={handleStartCasePractice}
          onHomePromptSend={handleSendDialogueHomePrompt}
          onQuickPromptSend={handleSendDialogueQuickPrompt}
          onHomeCaseSelect={handleOpenHomeCase}
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
          focusBlockId={
            activeMetaAgentTrajectoryAnchorBlockId ?? activeMetaAgentTrajectory?.anchorBlockId
          }
          metaAgentTrajectoryItems={isMetaAgentDialogue ? metaAgentTrajectoryItems : []}
          activeMetaAgentTrajectory={activeMetaAgentTrajectory}
          onSelectMetaAgentTrajectory={handleSelectMetaAgentTrajectory}
          onClearMetaAgentTrajectory={handleClearMetaAgentTrajectory}
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

  const meExpertPickerModal = (
    <Modal
      centered
      width={760}
      open={isMeExpertPickerOpen}
      title="给 ME 添加可调度的 AI 专家"
      className={styles.meExpertPickerModal}
      footer={
        <Button type="primary" onClick={() => setIsMeExpertPickerOpen(false)}>
          完成
        </Button>
      }
      onCancel={() => setIsMeExpertPickerOpen(false)}
      destroyOnHidden
    >
      {meSchedulableExpertOptions.length > 0 ? (
        <div className={styles.meExpertPickerStoreRoot}>
          <div className={agentStoreStyles.agentGrid}>
            {meSchedulableExpertOptions.map(expert => {
              const isAdded = assignedMeSchedulableAgentIds.has(expert.id);

              return (
                <article key={expert.id} className={agentStoreStyles.agentCard}>
                  <div className={agentStoreStyles.cardContent}>
                    <div
                      className={agentStoreStyles.visualPanel}
                      style={{ background: getAgentStoreDomainTone(expert.businessLine) }}
                    >
                      <div className={agentStoreStyles.visualGlow} />
                      <img
                        alt={expert.name}
                        className={agentStoreStyles.agentPortrait}
                        src={getAvatarUrl(expert.visualSeed)}
                      />
                    </div>

                    <div className={agentStoreStyles.cardBody}>
                      <div className={agentStoreStyles.cardTitleRow}>
                        <h3 className={agentStoreStyles.cardTitle}>{expert.name}</h3>
                      </div>

                      <div className={agentStoreStyles.badgeRow}>
                        <span
                          className={`${agentStoreStyles.miniBadge} ${agentStoreStyles.sourceBadge}`}
                        >
                          FrontisAI发布
                        </span>
                        <span
                          className={`${agentStoreStyles.miniBadge} ${agentStoreStyles.domainBadge}`}
                        >
                          {expert.businessLineLabel}
                        </span>
                      </div>

                      <p className={agentStoreStyles.agentDescription}>{expert.summary}</p>
                    </div>
                  </div>

                  <div className={agentStoreStyles.cardFooter}>
                    <Button
                      className={`${agentStoreStyles.cardActionButton} ${agentStoreStyles.cardActionButtonPrimary}`}
                      disabled={isAdded}
                      onClick={() => handleAddMeSchedulableExpert(expert.id)}
                    >
                      {isAdded ? "已添加" : "添加到专家列表"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.meExpertPickerEmpty}>暂无可添加的 AI 专家。</div>
      )}
    </Modal>
  );

  if (embedded) {
    return (
      <div className={styles.embeddedPage}>
        {renderContent()}
        {meOnboardingProfileModal}
        {meExpertPickerModal}
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
      {meExpertPickerModal}
    </div>
  );
};

export default FrontisPage;
