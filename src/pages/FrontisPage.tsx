import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppstoreOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Empty, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import type { Block } from "@/types/block";
import {
  getLoginPath,
  getSystemEntries,
  getTenantEntries,
  getTenantAdminManagementPath,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantUsers } from "@/feature/auth/mockTenantRegistry";
import type { MockAuthSystemEntry } from "@/feature/auth/types";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import type { AiCeoAgentHomeConfig, AiCeoHomeCaseItem } from "@/constants/aiCeoHome";
import {
  EXPERT_PLAZA_LABEL,
  MANAGEMENT_CONSOLE_LABEL,
  MA_WORKBENCH_LABEL,
} from "@/constants/brand";
import type { ArtifactItem } from "@/types/artifact";
import { hasUserInAccessScope } from "@/utils/organizationAccess";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";
import { AI_CEO_AGENT_HOME_CONFIGS, AI_CEO_DEFAULT_HOME_CONFIG } from "@/constants/aiCeoHome";
import {
  FRONTIS_COMPLETE_PRD_V430_DOCUMENT_CONTENT,
  FRONTIS_COMPLETE_PRD_V430_DOCUMENT_NAME,
} from "@/mocks/documents/productManagerDocuments";
import { dialogueScenarioRuntimeHelpers } from "@/utils/dialogueScenarioRuntime";

import { DialoguePrototypeView } from "./components/DialoguePrototypeView";
import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_RESULTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_ORGANIZATION_DEPARTMENTS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";
import type {
  DialogueScenarioFrame,
  DialogueScenarioMessageSnapshot,
} from "@/types/dialogueScenario";
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

const FEISHU_QR_CONFIGURED_STORAGE_KEY = "frontis_meta_agent_feishu_qr_configured";
const FEISHU_QR_CODE_STORAGE_KEY = "frontis_meta_agent_feishu_qr_code";
const FEISHU_QR_UPDATED_EVENT = "frontis:feishu-qrcode-updated";
const DEFAULT_CONVERSATION_EMPLOYEE_ID = "employee-writer";
const MANAGEMENT_USER_ROLES = new Set(["enterpriseAdmin"]);
const ACTIVE_WORKSPACE_STATUSES = new Set<StatusTone>(["online", "busy", "idle"]);
const DEFAULT_WORKSPACE_AGENT_ORDER: string[] = [DEFAULT_CONVERSATION_EMPLOYEE_ID];
const TEAM_MENTION_ALL_LABEL = "所有agent";
const MAX_HOME_PROMPT_ITEM_COUNT = 6;
const DEFAULT_WORKSPACE_AGENT_NAME = "MetaAegnt";
const EXPERT_TEAM_MAIN_AGENT_NAME = DEFAULT_WORKSPACE_AGENT_NAME;
const META_AGENT_SCENARIO_TEAM_ID = "team-product";
const META_AGENT_PRIMARY_SEED_SOURCE_ID = "dialogue-seed-team-product-collab";
const META_AGENT_PRIMARY_SEED_SESSION_ID = "dialogue-seed-metaagent-collab";
const META_AGENT_ONBOARDING_SESSION_ID = "dialogue-seed-metaagent-onboarding";
const NEW_USER_ONBOARDING_TENANT_ID = "tenant-new-user-onboarding-demo";
const EXPERT_TEAM_MAIN_AGENT_DESCRIPTION =
  "作为默认主Agent，负责理解需求、调度你有权限使用的专家并统一交付。";
const PRODUCT_TEAM_COLLAB_QUESTION = "帮我把这个需求拆成核心模块、边界和依赖关系。";
const PRODUCT_TEAM_RISK_QUESTION = "这版方案上线前，架构层面最需要提前规避哪些风险？";
const META_AGENT_RISK_PRIORITY_DOCUMENT = `# 上线风险优先级清单

## P0
- 权限边界未收敛前，不允许开放批量成员和外部专家调用。
- 关键工作流需要保留任务、成果和调用链路的审计记录。

## P1
- 成果预览和下载需要同源权限校验。
- MetaAegnt 调度范围需以用户授权专家为准，而不是仅限工作台已添加专家。
`;
const META_AGENT_RISK_ACCEPTANCE_DOCUMENT = `# 上线前验收与回归计划

## 验收范围
- 组织角色、权限配置、预设角色继承关系。
- MetaAegnt 自动升级专家版本后的任务连续性。
- 工作轨迹、任务、成果之间的定位关系。

## 回归重点
- 个人版不展示租户总览。
- 团队版企业管理员可查看团队 AI 专家看板。
`;

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

const replaceMetaAgentCopy = (value: string): string =>
  value
    .replace(/产研协作专家团/g, DEFAULT_WORKSPACE_AGENT_NAME)
    .replace(/Metaagent/g, DEFAULT_WORKSPACE_AGENT_NAME)
    .replace(/默认Agent/g, DEFAULT_WORKSPACE_AGENT_NAME)
    .replace(/工作站/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const isMetaAgentEmployee = (employee: EmployeeItem | null): boolean =>
  Boolean(employee?.isExpertTeam && employee.name === DEFAULT_WORKSPACE_AGENT_NAME);

const createMetaAgentArtifactBlock = (artifact: ArtifactItem, sequence: number): Block => ({
  id: `block-${artifact.id}`,
  kind: "artifact",
  data: {
    artifact_id: artifact.artifactId,
    kind: "markdown",
    title: artifact.fileName,
    status: "completed",
    format: "markdown",
  },
  sequence,
});

const createMetaAgentRiskArtifacts = (): ArtifactItem[] => [
  dialogueScenarioRuntimeHelpers.createMarkdownArtifact(
    META_AGENT_PRIMARY_SEED_SESSION_ID,
    "metaagent-risk-priority",
    "上线风险优先级清单.md",
    DEFAULT_WORKSPACE_AGENT_NAME,
    "上线风险复核",
    META_AGENT_RISK_PRIORITY_DOCUMENT,
    "11:18",
    dialogueScenarioRuntimeHelpers.resolveTextArtifactSize(META_AGENT_RISK_PRIORITY_DOCUMENT),
  ),
  dialogueScenarioRuntimeHelpers.createMarkdownArtifact(
    META_AGENT_PRIMARY_SEED_SESSION_ID,
    "metaagent-risk-acceptance",
    "上线前验收与回归计划.md",
    DEFAULT_WORKSPACE_AGENT_NAME,
    "上线风险复核",
    META_AGENT_RISK_ACCEPTANCE_DOCUMENT,
    "11:21",
    dialogueScenarioRuntimeHelpers.resolveTextArtifactSize(META_AGENT_RISK_ACCEPTANCE_DOCUMENT),
  ),
];

const buildMetaAgentSeedSessions = (): DialogueSessionItem[] => {
  const sourceSession = INITIAL_DIALOGUE_SESSIONS.find(
    item => item.id === META_AGENT_PRIMARY_SEED_SOURCE_ID,
  );
  const riskArtifacts = createMetaAgentRiskArtifacts();
  const flattenedMessages = [
    ...(sourceSession?.messages.map(message => ({
      ...message,
      author: replaceMetaAgentCopy(message.author),
      content: replaceMetaAgentCopy(message.content),
    })) ?? []),
    {
      id: "metaagent-risk-user-1",
      role: "user" as const,
      author: "你",
      content: PRODUCT_TEAM_RISK_QUESTION,
      timeLabel: "11:15",
    },
    {
      id: "metaagent-risk-assistant-1",
      role: "assistant" as const,
      author: DEFAULT_WORKSPACE_AGENT_NAME,
      content:
        "我已拉起架构规划师、交付验收官和数据洞察师协同评审，当前先给你一版统一风险结论和处理优先级。",
      timeLabel: "11:15",
      blocks: riskArtifacts.map((artifact, index) => createMetaAgentArtifactBlock(artifact, index)),
    },
  ];

  return [
    {
      id: META_AGENT_PRIMARY_SEED_SESSION_ID,
      employeeId: DEFAULT_CONVERSATION_EMPLOYEE_ID,
      title: "MetaAegnt 持续对话",
      preview: "MetaAegnt 已汇总近期协同任务，并持续在同一条工作线程内追加记录。",
      updatedAt: "11:15",
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
  title: "欢迎使用 MetaAgent",
  preview: "MetaAgent 可以理解你的目标、调度 AI 专家、沉淀成果，也可以按你的习惯设置名称和风格。",
  updatedAt: "刚刚",
  messages: [
    {
      id: "metaagent-onboarding-assistant-1",
      role: "assistant",
      author: DEFAULT_WORKSPACE_AGENT_NAME,
      content: `**你好，我是 MetaAgent。**

你可以把我当成你的工作入口：直接告诉我目标、上传文件，或者描述一个业务场景，我会帮你拆解任务、选择合适的 AI 专家，并把过程结论和成果文件整理出来。

你也可以先把我调成更顺手的样子：

- 给我起一个你习惯的名字
- 设置回答风格，比如严谨、简洁、销售型或管理型
- 让我优先按你的工作场景来组织输出

右上角的 **飞书按钮** 可以一键接入飞书。接入后，我可以围绕飞书消息、文档和协作场景继续帮你推进工作。`,
      timeLabel: "刚刚",
    },
  ],
});

const isNewUserOnboardingTenant = (tenantId?: string): boolean =>
  tenantId === NEW_USER_ONBOARDING_TENANT_ID;

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
    ...(INITIAL_DIALOGUE_ARTIFACTS[META_AGENT_PRIMARY_SEED_SOURCE_ID] ?? []),
    ...createMetaAgentRiskArtifacts(),
    createMetaAgentV430PrdArtifact(),
  ],
};
const NORMALIZED_INITIAL_DIALOGUE_RESULTS: Record<string, DialogueGeneratedResultItem[]> = {
  ...INITIAL_DIALOGUE_RESULTS,
  [META_AGENT_PRIMARY_SEED_SESSION_ID]:
    INITIAL_DIALOGUE_RESULTS[META_AGENT_PRIMARY_SEED_SOURCE_ID] ?? [],
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
    { id: "metaagent-1", question: PRODUCT_TEAM_COLLAB_QUESTION },
    { id: "metaagent-2", question: PRODUCT_TEAM_RISK_QUESTION },
    {
      id: "metaagent-3",
      question: "结合我的目标，帮我协调有权限的专家给出分工方案和最终交付清单。",
    },
    { id: "metaagent-4", question: "先判断这个需求该调用哪些专家，再给我一版统一输出。" },
  ];
  const fallbackCaseImage = primaryConfig.caseItems?.[0]?.coverImage;
  const metaCaseItems: AiCeoHomeCaseItem[] = [
    {
      id: "metaagent-case-collab",
      scene: "多专家协同",
      title: "MetaAegnt 协同拆解需求",
      summary: "MetaAegnt 先识别问题，再调度产品、架构、增长等专家分工协作并统一交付。",
      coverImage: fallbackCaseImage,
      replayScenarioQuestion: PRODUCT_TEAM_COLLAB_QUESTION,
      messages: [
        {
          id: "metaagent-case-collab-1",
          role: "user",
          actor: "你",
          content: PRODUCT_TEAM_COLLAB_QUESTION,
        },
        {
          id: "metaagent-case-collab-2",
          role: "assistant",
          actor: DEFAULT_WORKSPACE_AGENT_NAME,
          content: "我会先拆解需求，再调度相关专家协同分析，最后统一给你一版可执行方案。",
        },
      ],
    },
    {
      id: "metaagent-case-risk",
      scene: "风险评审",
      title: "MetaAegnt 协同评估上线风险",
      summary: "MetaAegnt 汇总架构、质量与数据视角，统一输出上线风险和治理建议。",
      coverImage: primaryConfig.caseItems?.[1]?.coverImage ?? fallbackCaseImage,
      replayScenarioQuestion: PRODUCT_TEAM_RISK_QUESTION,
      messages: [
        {
          id: "metaagent-case-risk-1",
          role: "user",
          actor: "你",
          content: PRODUCT_TEAM_RISK_QUESTION,
        },
        {
          id: "metaagent-case-risk-2",
          role: "assistant",
          actor: DEFAULT_WORKSPACE_AGENT_NAME,
          content: "我会调度相关专家一起评审，把关键风险、影响范围和处理建议统一整理出来。",
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

const resolveMetaAgentFallbackQuestion = (content: string): string => {
  const normalizedContent = content.trim();
  if (
    normalizedContent.includes("风险") ||
    normalizedContent.includes("上线") ||
    normalizedContent.includes("灰度") ||
    normalizedContent.includes("验收")
  ) {
    return PRODUCT_TEAM_RISK_QUESTION;
  }

  return PRODUCT_TEAM_COLLAB_QUESTION;
};

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
  const [isFeishuQrConfigured, setIsFeishuQrConfigured] = useState<boolean>(
    () => localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true",
  );
  const [feishuQrCode, setFeishuQrCode] = useState<string>(() => {
    const storedQrCode = localStorage.getItem(FEISHU_QR_CODE_STORAGE_KEY);
    if (storedQrCode) {
      return storedQrCode;
    }

    return localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true"
      ? "https://applink.feishu.cn/client/bot/open?app=frontis-meta-agent"
      : "";
  });
  const [isFeishuWorkspaceConnected, setIsFeishuWorkspaceConnected] = useState<boolean>(false);
  const dialogueTimerRefs = useRef<number[]>([]);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);

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
    setIsFeishuWorkspaceConnected(false);
  }, [activeIdentity?.tenantId, viewRole]);

  useEffect(() => {
    const handleFeishuQrUpdated = (event: Event): void => {
      const configured =
        event instanceof CustomEvent
          ? Boolean(event.detail?.configured)
          : localStorage.getItem(FEISHU_QR_CONFIGURED_STORAGE_KEY) === "true";
      const nextQrCode =
        event instanceof CustomEvent && typeof event.detail?.qrCode === "string"
          ? event.detail.qrCode
          : (localStorage.getItem(FEISHU_QR_CODE_STORAGE_KEY) ?? "");

      setIsFeishuQrConfigured(configured);
      setFeishuQrCode(nextQrCode);
      if (!configured) {
        setIsFeishuWorkspaceConnected(false);
      }
    };

    window.addEventListener(FEISHU_QR_UPDATED_EVENT, handleFeishuQrUpdated);

    return () => {
      window.removeEventListener(FEISHU_QR_UPDATED_EVENT, handleFeishuQrUpdated);
    };
  }, []);

  const employees = useMemo(
    () => INITIAL_EMPLOYEES.map(item => mapEmployeeForRole(item, viewRole)),
    [viewRole],
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
  const roleVisibleEmployees = useMemo(
    () => employees.filter(item => item.portalRoles.includes(viewRole)),
    [employees, viewRole],
  );
  const assignedConversationEmployees = useMemo(
    () =>
      roleVisibleEmployees.filter(item => {
        const isAssigned = currentUser?.assignedAgentIds.includes(item.id) ?? false;

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
    [currentUser, roleVisibleEmployees, tenantUsers, viewRole],
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
        : [...assignedConversationEmployees];

    return mergedEmployees.filter(
      (item, index) => mergedEmployees.findIndex(candidate => candidate.id === item.id) === index,
    );
  }, [assignedConversationEmployees, deviceDefaultAgents, workspaceMode]);
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
  const expertTeamScenarioLabel = useMemo(
    () =>
      activeEmployee
        ? getExpertTeamScenarioLabel(activeEmployee.summary, activeEmployee.name)
        : "当前业务场景",
    [activeEmployee],
  );
  const dialoguePlaceholder = useMemo(
    () =>
      isExpertTeamDialogue
        ? `请输入你的具体需求，例如：${expertTeamScenarioLabel}`
        : effectiveSelectedSkills.length
          ? `已选择技能：${selectedSkillNamesLabel}，请输入你的具体需求`
          : "输入消息或上传附件",
    [
      effectiveSelectedSkills.length,
      expertTeamScenarioLabel,
      isExpertTeamDialogue,
      selectedSkillNamesLabel,
    ],
  );

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
      const exactTeamScenario = activeEmployee.isExpertTeam
        ? findDialogueScenario(
            resolveDialogueScenarioEmployeeId(activeEmployee),
            scenarioQuestion,
            createId("dialogue-scenario"),
          )
        : null;
      const metaAgentFallbackScenario =
        !exactTeamScenario && isSingleThreadMetaAgentDialogue
          ? findDialogueScenario(
              META_AGENT_SCENARIO_TEAM_ID,
              resolveMetaAgentFallbackQuestion(scenarioQuestion),
              createId("dialogue-scenario"),
            )
          : null;
      const matchedScenario =
        exactTeamScenario ??
        metaAgentFallbackScenario ??
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
        ? "MetaAegnt 持续对话"
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

  const handleSendDialogueHomePrompt = useCallback(
    (question: string): void => {
      commitDialogue(question, Boolean(activeCaseReplay));
    },
    [activeCaseReplay, commitDialogue],
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
      label: `进入${entry.label}`,
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
          onHomeCaseSelect={handleOpenHomeCase}
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

  if (embedded) {
    return <div className={styles.embeddedPage}>{renderContent()}</div>;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <div className={styles.content}>{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default FrontisPage;
