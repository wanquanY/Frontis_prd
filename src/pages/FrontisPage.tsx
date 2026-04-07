import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppstoreOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Empty, message } from "antd";
import { useNavigate } from "react-router-dom";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import { getAdminManagementPath } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { ArtifactItem } from "@/types/artifact";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";
import {
  AI_CEO_AGENT_HOME_CONFIGS,
  AI_CEO_DEFAULT_HOME_CONFIG,
  WORKSPACE_DEFAULT_AGENT_CONFIG_IDS,
} from "@/constants/aiCeoHome";

import { DialoguePrototypeView } from "./components/DialoguePrototypeView";
import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_RESULTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";
import { findDialogueScenario } from "./dialogueScenarioSimulation";
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
  revokeComposerAttachmentPreview,
} from "./utils";
import { mapDialogueSessionForRole, mapEmployeeForRole } from "./agentDisplay";
import styles from "./FrontisPage.module.less";

interface FrontisPageProps {
  viewRole: FrontisWebRole;
}

const DEFAULT_CONVERSATION_EMPLOYEE_ID = "employee-writer";
const MANAGEMENT_USER_ROLES = new Set(["boss", "admin"]);
const ACTIVE_WORKSPACE_STATUSES = new Set<StatusTone>(["online", "busy", "idle"]);
const DEFAULT_WORKSPACE_AGENT_ORDER: string[] = Object.values(WORKSPACE_DEFAULT_AGENT_CONFIG_IDS);

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

const buildWorkspaceDefaultAgent = (
  workspace: WorkspaceItem,
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
    boundMembers: currentUserName ? [currentUserName] : [],
    welcomeMessage: homeConfig.intro,
    systemPrompt: `你是绑定在 ${workspace.name} 上的默认 Agent，优先帮助用户结合设备上下文完成任务整理、任务触达和结果收口。`,
    skills: homeConfig.skillItems.map(item => item.id),
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
const FrontisPage = ({ viewRole }: FrontisPageProps): JSX.Element => {
  const navigate = useNavigate();
  const { logout, session } = useMockAuth();
  const [isDialogueSidebarCollapsed, setIsDialogueSidebarCollapsed] = useState<boolean>(false);
  const [dialogueSessions, setDialogueSessions] =
    useState<DialogueSessionItem[]>(() =>
      INITIAL_DIALOGUE_SESSIONS.map(item => mapDialogueSessionForRole(item, viewRole)),
    );
  const [dialogueArtifactsBySession, setDialogueArtifactsBySession] = useState<
    Record<string, ArtifactItem[]>
  >(INITIAL_DIALOGUE_ARTIFACTS);
  const [dialogueResultsBySession, setDialogueResultsBySession] = useState<
    Record<string, DialogueGeneratedResultItem[]>
  >(INITIAL_DIALOGUE_RESULTS);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(
    DEFAULT_CONVERSATION_EMPLOYEE_ID,
  );
  const [activeDialogueSessionId, setActiveDialogueSessionId] = useState<string>("");
  const [isDialogueHomeActive, setIsDialogueHomeActive] = useState<boolean>(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [defaultAgentNameOverrides, setDefaultAgentNameOverrides] = useState<Record<string, string>>(
    {},
  );
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
        ? INITIAL_FRONTIS_WEB_USERS.find(
            item => MANAGEMENT_USER_ROLES.has(item.role) && item.status === "active",
          ) ??
          INITIAL_FRONTIS_WEB_USERS.find(item => MANAGEMENT_USER_ROLES.has(item.role))
        : INITIAL_FRONTIS_WEB_USERS.find(item => item.role === "member" && item.status === "active") ??
          INITIAL_FRONTIS_WEB_USERS.find(item => item.role === "member")) ??
      null,
    [session?.userId, viewRole],
  );
  const roleVisibleEmployees = useMemo(
    () => employees.filter(item => item.portalRoles.includes(viewRole)),
    [employees, viewRole],
  );
  const deviceDefaultAgents = useMemo(
    () =>
      (currentUser?.assignedWorkspaceIds ?? [])
        .map(workspaceId => workspaces.find(item => item.id === workspaceId) ?? null)
        .map(workspace =>
          workspace
            ? buildWorkspaceDefaultAgent(
                workspace,
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
  const conversationEmployees = useMemo(
    () => {
      const assignedEmployees = roleVisibleEmployees.filter(item => {
        const isAssigned = currentUser?.assignedAgentIds.includes(item.id) ?? false;
        if (!isAssigned) {
          return false;
        }
        if (viewRole === "admin") {
          return true;
        }
        return item.visibility === "all" || item.boundMembers.includes(currentUser?.name ?? "");
      });

      const mergedEmployees = [...deviceDefaultAgents, ...assignedEmployees];
      const uniqueEmployees = mergedEmployees.filter(
        (item, index) => mergedEmployees.findIndex(candidate => candidate.id === item.id) === index,
      );

      return sortConversationEmployees(uniqueEmployees);
    },
    [
      currentUser?.assignedAgentIds,
      currentUser?.name,
      deviceDefaultAgents,
      roleVisibleEmployees,
      viewRole,
    ],
  );

  const activeEmployee = useMemo(
    () =>
      conversationEmployees.find(item => item.id === activeEmployeeId) ??
      conversationEmployees[0] ??
      null,
    [activeEmployeeId, conversationEmployees],
  );

  const employeeDialogueSessions = useMemo(
    () =>
      activeEmployee ? dialogueSessions.filter(item => item.employeeId === activeEmployee.id) : [],
    [activeEmployee, dialogueSessions],
  );

  const activeDialogueSession = useMemo(
    () => {
      if (isDialogueHomeActive) {
        return null;
      }
      return (
        employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ??
        employeeDialogueSessions[0] ??
        null
      );
    },
    [activeDialogueSessionId, employeeDialogueSessions, isDialogueHomeActive],
  );
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
    () => (activeDialogueSession ? (dialogueArtifactsBySession[activeDialogueSession.id] ?? []) : []),
    [activeDialogueSession, dialogueArtifactsBySession],
  );
  const activeDialogueResults = useMemo(
    () => (activeDialogueSession ? (dialogueResultsBySession[activeDialogueSession.id] ?? []) : []),
    [activeDialogueSession, dialogueResultsBySession],
  );
  const isDialogueResponding = activeDialogueSession?.id === respondingDialogueSessionId;
  const activeAgentHomeConfig = useMemo(
    () =>
      activeEmployee
        ? (AI_CEO_AGENT_HOME_CONFIGS[activeEmployee.id] ?? AI_CEO_DEFAULT_HOME_CONFIG)
        : AI_CEO_DEFAULT_HOME_CONFIG,
    [activeEmployee],
  );
  const selectedSkill = useMemo(
    () =>
      selectedSkillId
        ? (activeAgentHomeConfig.skillItems.find(item => item.id === selectedSkillId) ?? null)
        : null,
    [activeAgentHomeConfig.skillItems, selectedSkillId],
  );
  const dialoguePlaceholder = useMemo(
    () =>
      selectedSkill
        ? `已选择技能：${selectedSkill.name}，请输入你的具体需求`
        : "输入消息或上传附件",
    [selectedSkill],
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
    if (!selectedSkillId) {
      return;
    }
    if (activeAgentHomeConfig.skillItems.some(item => item.id === selectedSkillId)) {
      return;
    }
    setSelectedSkillId(null);
  }, [activeAgentHomeConfig.skillItems, selectedSkillId]);

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
      setActiveEmployeeId(employeeId);
      const nextEmployeeSessions = dialogueSessions.filter(item => item.employeeId === employeeId);
      setActiveDialogueSessionId(isDialogueHomeActive ? "" : (nextEmployeeSessions[0]?.id ?? ""));
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillId(null);
    },
    [dialogueAttachments, dialogueSessions, isDialogueHomeActive],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      setIsDialogueHomeActive(false);
      setActiveDialogueSessionId(sessionId);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillId(null);
    },
    [dialogueAttachments],
  );

  const handleCreateDialogueSession = useCallback((): void => {
    setIsDialogueHomeActive(true);
    setActiveDialogueSessionId("");
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setDialogueInputValue("");
    setSelectedSkillId(null);
  }, [dialogueAttachments]);

  const handleSelectSkill = useCallback((skillId: string): void => {
    setSelectedSkillId(current => (current === skillId ? null : skillId));
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
    (
      sessionId: string,
      updater: (session: DialogueSessionItem) => DialogueSessionItem,
    ): void => {
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

  const commitDialogue = useCallback((rawInput: string): void => {
    if (!activeEmployee) return;
    const content = rawInput.trim();
    if (!content && dialogueAttachments.length === 0) return;

    const fallbackContent = "已发送附件，请结合文件内容继续处理。";
    const scenarioQuestion = content || fallbackContent;
    const matchedScenario = findDialogueScenario(
      activeEmployee.id,
      scenarioQuestion,
      createId("dialogue-scenario"),
    );
    const targetSessionId = activeDialogueSession?.id ?? createId("dialogue-session");
    const nextSessionTitle =
      matchedScenario?.title ??
      (content.length > 0
        ? content.slice(0, 18)
        : (dialogueAttachments[0]?.name ??
          (selectedSkill ? `${selectedSkill.name}需求` : "新对话")));
    const messageAttachments =
      dialogueAttachments.length > 0 ? dialogueAttachments.map(buildAttachmentItem) : undefined;
    const userMessageContent = selectedSkill
      ? `技能：${selectedSkill.name}\n需求：${content || fallbackContent}`
      : (content || fallbackContent);
    const sessionPreview = selectedSkill
      ? `${selectedSkill.name} · ${content || fallbackContent}`
      : (content || fallbackContent);

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

    setActiveDialogueSessionId(targetSessionId);
    setIsDialogueHomeActive(false);
    setDialogueInputValue("");
    setSelectedSkillId(null);
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setRespondingDialogueSessionId(targetSessionId);
    clearDialogueTimers();

    if (matchedScenario) {
      const [firstFrame, ...remainingFrames] = matchedScenario.frames;
      const assistantMessageId = createId("dialogue");

      if (!firstFrame) {
        setRespondingDialogueSessionId(null);
        return;
      }

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
        ...currentSession,
        preview: firstFrame.preview,
        updatedAt: "刚刚",
        messages: [
          ...currentSession.messages,
          {
            id: assistantMessageId,
            role: "assistant",
            author: activeEmployee.name,
            content: firstFrame.preview,
            timeLabel: "刚刚",
            blocks: firstFrame.blocks,
            followupSuggestions: firstFrame.followupSuggestions,
          },
        ],
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
          updateDialogueSession(targetSessionId, currentSession => ({
            ...currentSession,
            preview: frame.preview,
            updatedAt: "刚刚",
            messages: currentSession.messages.map(message =>
              message.id === assistantMessageId
                  ? {
                      ...message,
                      content: frame.preview,
                      timeLabel: "刚刚",
                      blocks: frame.blocks,
                      followupSuggestions: frame.followupSuggestions,
                    }
                  : message,
              ),
          }));

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

    const responseText = selectedSkill
      ? `已按「${selectedSkill.name}」开始处理，我会先聚焦这项能力来回应你的需求。`
      : "已继续处理当前任务，结果会直接回流到本轮对话和右侧成果面板；如需管理员或其他角色协同，我会同步提醒。";

    const timerId = window.setTimeout(() => {
      const nextAssistantMessage = {
        id: createId("dialogue"),
        role: "assistant" as const,
        author: activeEmployee.name,
        content: `${responseText} 同时我会把相关事项同步到当前会话和定时任务页，方便继续追踪。`,
        timeLabel: "刚刚",
      };
      setDialogueSessions(prev => {
        const currentSession = prev.find(item => item.id === targetSessionId);
        if (!currentSession) {
          return prev;
        }
        const nextSession: DialogueSessionItem = {
          ...currentSession,
          preview: nextAssistantMessage.content,
          updatedAt: "刚刚",
          messages: [...currentSession.messages, nextAssistantMessage],
        };
        return [nextSession, ...prev.filter(item => item.id !== targetSessionId)];
      });
      setRespondingDialogueSessionId(current => (current === targetSessionId ? null : current));
      dialogueTimerRefs.current = dialogueTimerRefs.current.filter(
        currentTimerId => currentTimerId !== timerId,
      );
    }, 1200);
    dialogueTimerRefs.current.push(timerId);
  }, [
    activeDialogueSession,
    activeEmployee,
    clearDialogueTimers,
    dialogueAttachments,
    selectedSkill,
    updateDialogueSession,
  ]);

  const handleSendDialogue = useCallback((): void => {
    commitDialogue(dialogueInputValue);
  }, [commitDialogue, dialogueInputValue]);

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

  const handleSendDialogueHomePrompt = useCallback((question: string): void => {
    commitDialogue(question);
  }, [commitDialogue]);

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
    logout();
    message.success("已退出模拟登录。");
    navigate("/portal", { replace: true });
  }, [logout, navigate]);

  const handleOpenManagementPortal = useCallback((): void => {
    navigate(getAdminManagementPath());
  }, [navigate]);

  const accountMenuItems: MenuProps["items"] = [
    ...(currentUser && MANAGEMENT_USER_ROLES.has(currentUser.role)
      ? [
          {
            key: "management",
            icon: <AppstoreOutlined />,
            label: "管理后台",
            onClick: handleOpenManagementPortal,
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
          isSidebarCollapsed={isDialogueSidebarCollapsed}
          isDialogueResponding={isDialogueResponding}
          defaultAgentIds={deviceDefaultAgents.map(item => item.id)}
          onCreateDialogueSession={handleCreateDialogueSession}
          onDialogueAttachmentsSelected={handleDialogueAttachmentsSelected}
          onDialogueInputChange={setDialogueInputValue}
          onDialogueSessionSelect={handleSelectDialogueSession}
          onFollowupClick={handleSendDialogueHomePrompt}
          onHomePromptSend={handleSendDialogueHomePrompt}
          onRenameDefaultAgent={handleRenameDefaultAgent}
          onRemoveDialogueSession={handleRemoveDialogueSession}
          onRenameDialogueSession={handleRenameDialogueSession}
          onEmployeeSelect={handleSelectEmployee}
          onRemoveAttachment={handleRemoveDialogueAttachment}
          onSkillSelect={handleSelectSkill}
          onSendDialogue={handleSendDialogue}
          onToggleSidebar={() => setIsDialogueSidebarCollapsed(current => !current)}
          selectedSkillId={selectedSkillId}
          onStopDialogue={handleStopDialogue}
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
