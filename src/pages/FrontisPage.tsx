import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppstoreOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Empty, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import {
  getAdminManagementPath,
  getLoginPath,
  getSystemEntries,
  getTenantEntries,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { AiCeoAgentHomeConfig, AiCeoHomeCaseItem } from "@/constants/aiCeoHome";
import type { ArtifactItem } from "@/types/artifact";
import { hasUserInAccessScope } from "@/utils/organizationAccess";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";
import {
  AI_CEO_AGENT_HOME_CONFIGS,
  AI_CEO_DEFAULT_HOME_CONFIG,
  WORKSPACE_DEFAULT_AGENT_CONFIG_IDS,
} from "@/constants/aiCeoHome";
import { OWNED_EXPERT_TEAMS } from "./components/agentStore/agentStoreData";

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
  StatusTone,
  WorkspaceItem,
} from "./types";
import {
  buildAttachmentItem,
  createComposerAttachment,
  createId,
  getAvatarUrl,
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
}

const DEFAULT_CONVERSATION_EMPLOYEE_ID = "employee-writer";
const MANAGEMENT_USER_ROLES = new Set(["enterpriseAdmin"]);
const ACTIVE_WORKSPACE_STATUSES = new Set<StatusTone>(["online", "busy", "idle"]);
const DEFAULT_WORKSPACE_AGENT_ORDER: string[] = Object.values(WORKSPACE_DEFAULT_AGENT_CONFIG_IDS);
const TEAM_MENTION_ALL_LABEL = "所有agent";
const MAX_HOME_PROMPT_ITEM_COUNT = 6;
const EXPERT_TEAM_MAIN_AGENT_NAME = "Metaagent";
const EXPERT_TEAM_MAIN_AGENT_DESCRIPTION =
  "作为专家团默认主agent，负责理解需求、调度成员并统一交付。";
const PRODUCT_TEAM_COLLAB_QUESTION = "帮我把这个需求拆成核心模块、边界和依赖关系。";
const PRODUCT_TEAM_RISK_QUESTION = "这版方案上线前，架构层面最需要提前规避哪些风险？";

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
    ? buildDialogueScenarioReplay(employee.id, item.replayScenarioQuestion, replaySessionId)
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
  workspace: WorkspaceItem,
  currentUserId?: string,
  currentUserName?: string,
  nameOverride?: string,
): EmployeeItem | null => {
  const agentId =
    WORKSPACE_DEFAULT_AGENT_CONFIG_IDS[
      workspace.id as keyof typeof WORKSPACE_DEFAULT_AGENT_CONFIG_IDS
    ];

  if (!agentId) {
    return null;
  }

  const homeConfig = AI_CEO_AGENT_HOME_CONFIGS[agentId] ?? AI_CEO_DEFAULT_HOME_CONFIG;

  return {
    id: agentId,
    name: nameOverride?.trim() || `${workspace.name}默认Agent`,
    avatarUrl: getAvatarUrl(agentId),
    role: workspace.summary,
    portalRoles: ["admin", "employee"],
    status: ACTIVE_WORKSPACE_STATUSES.has(workspace.status) ? "online" : "offline",
    workspaceId: workspace.id,
    connectionMode: workspace.type === "cloud" ? "cloud" : "local",
    model: workspace.type === "cloud" ? "gpt-4o" : "local-runtime",
    summary: homeConfig.intro,
    lastAction: ACTIVE_WORKSPACE_STATUSES.has(workspace.status)
      ? `已绑定 ${workspace.name}，可直接查看案例或开始提问`
      : `${workspace.name} 当前未就绪，可先看案例回放和推荐问法`,
    source: "openclaw",
    visibility: "all",
    subAgentModel: workspace.type === "cloud" ? "gpt-4o-mini" : "device-runtime",
    agentId: `default-agent-${workspace.id}`,
    runtimeAgentId: `default-runtime-${workspace.id}`,
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
    welcomeMessage: homeConfig.intro,
    systemPrompt: `你是绑定在 ${workspace.name} 上的默认 Agent，优先帮助用户结合设备上下文完成任务整理、任务触达和结果收口。`,
    skills: homeConfig.skillItems.map(item => item.id),
  };
};

/**
 * 基于企业后台已购专家团，构建工作台中的专家团会话入口。
 */
const buildConversationExpertTeamEmployee = (
  memberEmployees: EmployeeItem[],
  team: (typeof OWNED_EXPERT_TEAMS)[number],
): EmployeeItem | null => {
  if (memberEmployees.length === 0) {
    return null;
  }

  const primaryEmployee =
    memberEmployees.find(item => item.id === team.memberIds[0]) ?? memberEmployees[0];
  const uniqueSkillIds = Array.from(new Set(memberEmployees.flatMap(item => item.skills ?? [])));
  const scenarioLabel = getExpertTeamScenarioLabel(team.description, team.name);

  return {
    id: team.id,
    name: team.name,
    avatarUrl: primaryEmployee.avatarUrl,
    role: `${team.category}协作入口`,
    isExpertTeam: true,
    expertTeamId: team.id,
    expertTeamMemberIds: memberEmployees.map(item => item.id),
    expertTeamPrimaryMemberId: primaryEmployee.id,
    portalRoles: ["admin", "employee"],
    status: memberEmployees.some(item => item.status === "running")
      ? "running"
      : memberEmployees.some(item => item.status === "online")
        ? "online"
        : primaryEmployee.status,
    workspaceId: team.workspaceId,
    connectionMode: primaryEmployee.connectionMode,
    model: primaryEmployee.model,
    summary: `${scenarioLabel}等场景可由专家团协同处理。`,
    lastAction: `包含 ${memberEmployees.map(item => item.name).join("、")} 共 ${memberEmployees.length} 位 AI 专家`,
    source: primaryEmployee.source,
    visibility: "all",
    subAgentModel: primaryEmployee.subAgentModel,
    agentId: `${team.id}-coordinator`,
    runtimeAgentId: `${team.id}-runtime`,
    accessScopeSubjects: primaryEmployee.accessScopeSubjects,
    boundMembers: primaryEmployee.boundMembers,
    welcomeMessage: `我是${EXPERT_TEAM_MAIN_AGENT_NAME}，${EXPERT_TEAM_MAIN_AGENT_DESCRIPTION}`,
    systemPrompt: `你是${team.name}的协作入口，默认主agent是${EXPERT_TEAM_MAIN_AGENT_NAME}，${EXPERT_TEAM_MAIN_AGENT_DESCRIPTION}`,
    skills: uniqueSkillIds,
  };
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

/**
 * FrontisAI Web 原型主页面
 *
 * 当前页面通过路由区分普通用户与企业老板视图。
 */
const FrontisPage = ({ viewRole, embedded = false }: FrontisPageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();
  const [dialogueSessions, setDialogueSessions] = useState<DialogueSessionItem[]>(() =>
    INITIAL_DIALOGUE_SESSIONS.map(item => mapDialogueSessionForRole(item, viewRole)),
  );
  const [dialogueArtifactsBySession, setDialogueArtifactsBySession] = useState<
    Record<string, ArtifactItem[]>
  >(INITIAL_DIALOGUE_ARTIFACTS);
  const [dialogueResultsBySession, setDialogueResultsBySession] =
    useState<Record<string, DialogueGeneratedResultItem[]>>(INITIAL_DIALOGUE_RESULTS);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(
    DEFAULT_CONVERSATION_EMPLOYEE_ID,
  );
  const [activeDialogueSessionId, setActiveDialogueSessionId] = useState<string>("");
  const [isDialogueHomeActive, setIsDialogueHomeActive] = useState<boolean>(true);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [defaultAgentNameOverrides, setDefaultAgentNameOverrides] = useState<
    Record<string, string>
  >({});
  const [activeCaseReplay, setActiveCaseReplay] = useState<CaseReplayState | null>(null);
  const [dialogueInputValue, setDialogueInputValue] = useState<string>("");
  const [dialogueAttachments, setDialogueAttachments] = useState<WorkspaceComposerAttachmentItem[]>(
    [],
  );
  const [respondingDialogueSessionId, setRespondingDialogueSessionId] = useState<string | null>(
    null,
  );
  const dialogueTimerRefs = useRef<number[]>([]);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);
  const employees = useMemo(
    () => INITIAL_EMPLOYEES.map(item => mapEmployeeForRole(item, viewRole)),
    [viewRole],
  );
  const workspaces = useMemo(() => INITIAL_WORKSPACES, []);
  const currentUser = useMemo(
    () =>
      INITIAL_FRONTIS_WEB_USERS.find(item => item.id === session?.userId) ??
      (viewRole === "admin"
        ? (INITIAL_FRONTIS_WEB_USERS.find(
            item => MANAGEMENT_USER_ROLES.has(item.role) && item.status === "active",
          ) ?? INITIAL_FRONTIS_WEB_USERS.find(item => MANAGEMENT_USER_ROLES.has(item.role)))
        : (INITIAL_FRONTIS_WEB_USERS.find(
            item => item.role !== "enterpriseAdmin" && item.status === "active",
          ) ?? INITIAL_FRONTIS_WEB_USERS.find(item => item.role !== "enterpriseAdmin"))) ??
      null,
    [session?.userId, viewRole],
  );
  const roleVisibleEmployees = useMemo(
    () => employees.filter(item => item.portalRoles.includes(viewRole)),
    [employees, viewRole],
  );
  const assignedConversationEmployees = useMemo(
    () =>
      roleVisibleEmployees.filter(item => {
        const isAssigned = currentUser?.assignedAgentIds.includes(item.id) ?? false;
        if (!isAssigned) {
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
                INITIAL_FRONTIS_WEB_USERS,
                INITIAL_ORGANIZATION_DEPARTMENTS,
              )
            : false)
        );
      }),
    [currentUser, roleVisibleEmployees, viewRole],
  );
  const expertTeamEmployees = useMemo(
    () =>
      OWNED_EXPERT_TEAMS.map(team =>
        buildConversationExpertTeamEmployee(
          team.memberIds
            .map(memberId => roleVisibleEmployees.find(item => item.id === memberId) ?? null)
            .filter((item): item is EmployeeItem => item !== null),
          team,
        ),
      ).filter((item): item is EmployeeItem => item !== null),
    [roleVisibleEmployees],
  );
  const deviceDefaultAgents = useMemo(
    () =>
      (currentUser?.assignedWorkspaceIds ?? [])
        .map(workspaceId => workspaces.find(item => item.id === workspaceId) ?? null)
        .map(workspace =>
          workspace
            ? buildWorkspaceDefaultAgent(
                workspace,
                currentUser?.id,
                currentUser?.name,
                defaultAgentNameOverrides[
                  WORKSPACE_DEFAULT_AGENT_CONFIG_IDS[
                    workspace.id as keyof typeof WORKSPACE_DEFAULT_AGENT_CONFIG_IDS
                  ]
                ],
              )
            : null,
        )
        .filter((item): item is EmployeeItem => item !== null),
    [currentUser?.assignedWorkspaceIds, currentUser?.name, defaultAgentNameOverrides, workspaces],
  );
  const conversationEmployeeDirectory = useMemo(() => {
    const mergedEmployees = [...deviceDefaultAgents, ...assignedConversationEmployees];
    return mergedEmployees.filter(
      (item, index) => mergedEmployees.findIndex(candidate => candidate.id === item.id) === index,
    );
  }, [assignedConversationEmployees, deviceDefaultAgents]);
  const conversationEmployees = useMemo(() => {
    const expertTeamMemberIds = new Set(
      expertTeamEmployees.flatMap(item => item.expertTeamMemberIds ?? []),
    );
    const mergedEmployees = [
      ...deviceDefaultAgents,
      ...expertTeamEmployees,
      ...assignedConversationEmployees.filter(item => !expertTeamMemberIds.has(item.id)),
    ];
    const uniqueEmployees = mergedEmployees.filter(
      (item, index) => mergedEmployees.findIndex(candidate => candidate.id === item.id) === index,
    );

    return sortConversationEmployees(uniqueEmployees);
  }, [assignedConversationEmployees, deviceDefaultAgents, expertTeamEmployees]);
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
  const dialogueFollowupSuggestions = useMemo(() => {
    const lastMessage = dialogueMessages[dialogueMessages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      return [];
    }
    return lastMessage.followupSuggestions ?? [];
  }, [dialogueMessages]);
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
      setActiveEmployeeId(employeeId);
      const nextEmployeeSessions = dialogueSessions.filter(item => item.employeeId === employeeId);
      setActiveDialogueSessionId(isDialogueHomeActive ? "" : (nextEmployeeSessions[0]?.id ?? ""));
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillIds([]);
    },
    [dialogueAttachments, dialogueSessions, isDialogueHomeActive],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      setActiveCaseReplay(null);
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
    setActiveCaseReplay(null);
    setIsDialogueHomeActive(true);
    setActiveDialogueSessionId("");
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setDialogueInputValue("");
    setSelectedSkillIds([]);
  }, [dialogueAttachments]);

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

      const fallbackContent = "已发送附件，请结合文件内容继续处理。";
      const normalizedScenarioQuestion = content
        .replace(/(^|[\s\n])@[^\s@]+/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
      const scenarioQuestion = normalizedScenarioQuestion || fallbackContent;
      const matchedScenario =
        (activeEmployee.isExpertTeam
          ? findDialogueScenario(activeEmployee.id, scenarioQuestion, createId("dialogue-scenario"))
          : null) ??
        findDialogueScenario(
          respondingEmployee.id,
          scenarioQuestion,
          createId("dialogue-scenario"),
        );
      const targetSessionId =
        !createNewSession && activeDialogueSession?.id
          ? activeDialogueSession.id
          : createId("dialogue-session");
      const nextSessionTitle =
        matchedScenario?.title ??
        (content.length > 0
          ? content.slice(0, 18)
          : (dialogueAttachments[0]?.name ??
            (effectiveSelectedSkills.length
              ? `${effectiveSelectedSkills[0]?.name ?? "技能"}需求`
              : "新对话")));
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
          ? `${teamRouting.primaryEmployee.name} 已召集 ${teamRouting.teamMembers
              .map(item => item.name)
              .join("、")} 协同处理，我会先汇总每位专家的判断，再给你最终结论。`
          : selectedSkills.length
            ? `已按「${selectedSkillNamesLabel}」开始处理，我会先聚焦这些技能来回应你的需求。`
            : activeEmployee.isExpertTeam
              ? `${EXPERT_TEAM_MAIN_AGENT_NAME} 已接管本轮任务，如有需要会继续调度专家团其他成员协作。`
              : "已继续处理当前任务，结果会直接回流到本轮对话和右侧成果面板；如需管理员或其他角色协同，我会同步提醒。";

      const timerId = window.setTimeout(() => {
        const nextAssistantMessages =
          teamRouting?.mode === "all"
            ? [
                ...teamRouting.teamMembers.slice(0, 3).map(member => ({
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
      effectiveSelectedSkills.length,
      selectedSkillNamesLabel,
      updateDialogueSession,
    ],
  );

  const handleSendDialogue = useCallback((): void => {
    commitDialogue(dialogueInputValue);
  }, [commitDialogue, dialogueInputValue]);

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

  const handleRenameDefaultAgent = useCallback((employeeId: string, nextName: string): void => {
    if (!DEFAULT_WORKSPACE_AGENT_ORDER.includes(employeeId)) {
      return;
    }

    const trimmedName = nextName.trim();
    if (!trimmedName) {
      return;
    }

    setDefaultAgentNameOverrides(prev => ({
      ...prev,
      [employeeId]: trimmedName,
    }));
  }, []);

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
    (identityId: string, entryPath: string): void => {
      const result = activateIdentity(identityId, entryPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? entryPath, { replace: true });
    },
    [activateIdentity, navigate],
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
            label: "进入企业管理后台",
            onClick: () => navigate(getAdminManagementPath(), { replace: true }),
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
      onClick: () => handleOpenSystemEntry(entry.identityId, entry.entryPath),
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
          followupSuggestions={dialogueFollowupSuggestions}
          homeCaseItems={activeAgentHomeConfig.caseItems}
          homePromptItems={activeAgentHomeConfig.promptItems}
          homeSkillItems={activeAgentHomeConfig.skillItems}
          isHomeVisible={isDialogueHomeActive}
          isDialogueResponding={isDialogueResponding}
          defaultAgentIds={deviceDefaultAgents.map(item => item.id)}
          onCreateDialogueSession={handleCreateDialogueSession}
          onDialogueAttachmentsSelected={handleDialogueAttachmentsSelected}
          onDialogueInputChange={setDialogueInputValue}
          onDialogueSessionSelect={handleSelectDialogueSession}
          onFollowupClick={handleSendDialogueHomePrompt}
          isCaseReplayMode={Boolean(activeCaseReplay)}
          caseReplayActionLabel="立即实践"
          caseReplayOpenPanel={activeCaseReplay?.openPanel ?? null}
          onCaseReplayAction={handleStartCasePractice}
          onHomePromptSend={handleSendDialogueHomePrompt}
          onHomeCaseSelect={handleOpenHomeCase}
          onRenameDefaultAgent={handleRenameDefaultAgent}
          onRemoveDialogueSession={handleRemoveDialogueSession}
          onRenameDialogueSession={handleRenameDialogueSession}
          onEmployeeSelect={handleSelectEmployee}
          onRemoveAttachment={handleRemoveDialogueAttachment}
          onSkillSelect={handleSelectSkill}
          onSendDialogue={handleSendDialogue}
          selectedSkillIds={selectedSkillIds}
          onStopDialogue={handleStopDialogue}
          showAccountEntry={!embedded}
          viewerName={currentUser?.name ?? "你"}
        />
      );
    }

    return (
      <div className={styles.emptyPageState}>
        <Empty description="当前账号暂未分配 Agent，请联系管理员分配后再开始对话。" />
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
