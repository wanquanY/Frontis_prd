import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import {
  ClockCircleOutlined,
  CloudServerOutlined,
  MessageOutlined,
  RobotOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { SkillMarketplaceView } from "@/feature/skill/components/SkillMarketplaceView";
import {
  WORKSPACE_MODEL_OPTIONS,
  type WorkspaceComposerAttachmentItem,
} from "@/feature/workspace/types";
import { message } from "antd";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";

import { PrdAutomationTaskView } from "./components/PrdAutomationTaskView";
import { DialoguePrototypeView } from "./components/DialoguePrototypeView";
import { ExpertsPrototypeView } from "./components/ExpertsPrototypeView";
import { GroupPrototypeView } from "./components/GroupPrototypeView";
import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_SKILLS,
  INITIAL_WORKSPACES,
} from "@/mocks/prd/mockData";
import type {
  DialogueSessionItem,
  EmployeeItem,
  SynClawTabItem,
  SynClawTabKey,
  WorkspaceItem,
  WorkspaceType,
} from "./types";
import {
  buildPrdAttachmentItem,
  createPrdComposerAttachment,
  createPrdId,
  createPrdWorkspaceActivationInfo,
  getPrdAvatarUrl,
  PRD_EMPLOYEE_AVATAR_PRESETS,
  revokePrdComposerAttachmentPreview,
} from "./utils";
import styles from "./PrdPage.module.less";

type ExpertsModalMode = "create" | "edit" | null;

interface WorkspacePresetInfo {
  region: string;
  summary: string;
  runtimeHint: string;
  status: WorkspaceItem["status"];
}

const getWorkspacePresetInfo = (type: WorkspaceType): WorkspacePresetInfo => {
  if (type === "cloud") {
    return {
      status: "online",
      region: "云设备已直连",
      summary: "已创建云设备并直接连接，可继续承载云桌面与远端执行。",
      runtimeHint: "后续可直接扩展桌面预览、扫码和远端文件处理。",
    };
  }
  if (type === "local") {
    return {
      status: "online",
      region: "待客户端下载并登录",
      summary: "需先下载客户端并在目标设备登录，随后接入为本地工作站。",
      runtimeHint: "主要承载本机对话、附件和技能工作流，虚拟桌面能力不默认开启。",
    };
  }
  return {
    status: "pending",
    region: "待边缘设备激活",
    summary: "需先下载安装包，并在客户端内输入云端 API 与激活码后完成接入。",
    runtimeHint: "云端 API：https://syngents-api.frontis.cn，激活完成后再开放 AI 专家和任务能力。",
  };
};

const SYNCLAW_TABS: SynClawTabItem[] = [
  {
    key: "dialogue",
    label: "对话",
    description: "",
    icon: <MessageOutlined />,
  },
  {
    key: "group",
    label: "群聊",
    description: "",
    icon: <TeamOutlined />,
  },
  {
    key: "skills",
    label: "技能广场",
    description: "",
    icon: <ThunderboltOutlined />,
  },
  {
    key: "automation",
    label: "自动化",
    description: "",
    icon: <ClockCircleOutlined />,
  },
  {
    key: "experts",
    label: "AI 专家团",
    description: "",
    icon: <RobotOutlined />,
  },
];

/**
 * PRD 页面
 *
 * 当前页面用于承载 SynClaw 独立窗口页面实现，仅在开发环境和测试环境访问。
 */
const PrdPage = (): JSX.Element => {
  const [activeTabKey, setActiveTabKey] = useState<SynClawTabKey>("dialogue");
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(INITIAL_WORKSPACES);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(INITIAL_WORKSPACES[0].id);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>("employee-pm");
  const [dialogueSessions, setDialogueSessions] =
    useState<DialogueSessionItem[]>(INITIAL_DIALOGUE_SESSIONS);
  const [activeDialogueSessionId, setActiveDialogueSessionId] = useState<string>(
    INITIAL_DIALOGUE_SESSIONS.find(item => item.employeeId === "employee-pm")?.id ?? "",
  );
  const [dialogueInputValue, setDialogueInputValue] = useState<string>("");
  const [dialogueAttachments, setDialogueAttachments] = useState<WorkspaceComposerAttachmentItem[]>(
    [],
  );
  const [respondingDialogueSessionId, setRespondingDialogueSessionId] = useState<string | null>(
    null,
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>("");
  const [newWorkspaceType, setNewWorkspaceType] = useState<WorkspaceType>("cloud");
  const [newEmployeeName, setNewEmployeeName] = useState<string>("");
  const [newEmployeeRole, setNewEmployeeRole] = useState<string>("");
  const [newEmployeeModel, setNewEmployeeModel] = useState<string>(
    WORKSPACE_MODEL_OPTIONS[0].label,
  );
  const [newEmployeeAvatarUrl, setNewEmployeeAvatarUrl] = useState<string>(
    PRD_EMPLOYEE_AVATAR_PRESETS[0],
  );
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState<boolean>(false);
  const [isCreateEmployeeModalOpen, setIsCreateEmployeeModalOpen] = useState<boolean>(false);
  const [workspaceModalMode, setWorkspaceModalMode] = useState<ExpertsModalMode>(null);
  const [employeeModalMode, setEmployeeModalMode] = useState<ExpertsModalMode>(null);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const dialogueTimerRef = useRef<number | null>(null);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);

  const activeWorkspace = useMemo(
    () => workspaces.find(item => item.id === activeWorkspaceId) ?? workspaces[0],
    [activeWorkspaceId, workspaces],
  );

  const workspaceEmployees = useMemo(
    () => employees.filter(item => item.workspaceId === activeWorkspaceId),
    [activeWorkspaceId, employees],
  );

  const activeEmployee = useMemo(
    () =>
      employees.find(item => item.id === activeEmployeeId) ?? workspaceEmployees[0] ?? employees[0],
    [activeEmployeeId, employees, workspaceEmployees],
  );

  const employeeDialogueSessions = useMemo(
    () => dialogueSessions.filter(item => item.employeeId === activeEmployee.id),
    [activeEmployee.id, dialogueSessions],
  );

  const activeDialogueSession = useMemo(
    () =>
      employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ??
      employeeDialogueSessions[0] ??
      null,
    [activeDialogueSessionId, employeeDialogueSessions],
  );

  const dialogueMessages = activeDialogueSession?.messages ?? [];
  const activeDialogueArtifacts = useMemo(
    () =>
      activeDialogueSession ? (INITIAL_DIALOGUE_ARTIFACTS[activeDialogueSession.id] ?? []) : [],
    [activeDialogueSession],
  );
  const isDialogueResponding = activeDialogueSession?.id === respondingDialogueSessionId;

  const skillCountByEmployeeId = useMemo(
    () =>
      INITIAL_SKILLS.reduce<Record<string, number>>((result, skill) => {
        skill.installedFor.forEach(employeeId => {
          result[employeeId] = (result[employeeId] ?? 0) + 1;
        });
        return result;
      }, {}),
    [],
  );

  useEffect(() => {
    if (workspaceEmployees.some(item => item.id === activeEmployeeId)) return;
    if (workspaceEmployees[0]) {
      setActiveEmployeeId(workspaceEmployees[0].id);
    }
  }, [activeEmployeeId, workspaceEmployees]);

  useEffect(() => {
    if (!employeeDialogueSessions.length) {
      if (activeDialogueSessionId !== "") {
        setActiveDialogueSessionId("");
      }
      return;
    }
    if (employeeDialogueSessions.some(item => item.id === activeDialogueSessionId)) return;
    setActiveDialogueSessionId(employeeDialogueSessions[0].id);
  }, [activeDialogueSessionId, employeeDialogueSessions]);

  useEffect(() => {
    latestDialogueAttachmentsRef.current = dialogueAttachments;
  }, [dialogueAttachments]);

  useEffect(() => {
    return () => {
      if (dialogueTimerRef.current !== null) {
        window.clearTimeout(dialogueTimerRef.current);
      }
      latestDialogueAttachmentsRef.current.forEach(revokePrdComposerAttachmentPreview);
    };
  }, []);

  const buildAllowedComposerAttachments = useCallback(
    (files?: FileList | File[] | null): WorkspaceComposerAttachmentItem[] =>
      Array.from(files ?? []).reduce<WorkspaceComposerAttachmentItem[]>((result, file) => {
        if (!isChatAttachmentFileAllowed(file)) {
          return result;
        }
        result.push(createPrdComposerAttachment(file));
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
        revokePrdComposerAttachmentPreview(target);
      }
      return prev.filter(item => item.uid !== attachmentUid);
    });
  }, []);

  const handleSelectEmployee = useCallback(
    (employeeId: string): void => {
      const nextEmployee = employees.find(item => item.id === employeeId);
      if (nextEmployee) {
        setActiveWorkspaceId(nextEmployee.workspaceId);
      }
      setActiveEmployeeId(employeeId);
      const nextEmployeeSessions = dialogueSessions.filter(item => item.employeeId === employeeId);
      setActiveDialogueSessionId(nextEmployeeSessions[0]?.id ?? "");
      dialogueAttachments.forEach(revokePrdComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
    },
    [dialogueAttachments, dialogueSessions, employees],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      setActiveDialogueSessionId(sessionId);
      dialogueAttachments.forEach(revokePrdComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
    },
    [dialogueAttachments],
  );

  const handleCreateDialogueSession = useCallback((): void => {
    const nextSessionId = createPrdId("dialogue-session");
    const nextSession: DialogueSessionItem = {
      id: nextSessionId,
      employeeId: activeEmployee.id,
      title: "新对话",
      preview: "等待输入新的任务或附件。",
      updatedAt: "刚刚",
      messages: [],
    };
    setDialogueSessions(prev => [nextSession, ...prev]);
    setActiveDialogueSessionId(nextSessionId);
    dialogueAttachments.forEach(revokePrdComposerAttachmentPreview);
    setDialogueAttachments([]);
    setDialogueInputValue("");
  }, [activeEmployee.id, dialogueAttachments]);

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

  const handleSendDialogue = useCallback((): void => {
    const content = dialogueInputValue.trim();
    if (!content && dialogueAttachments.length === 0) return;
    const targetSessionId = activeDialogueSession?.id ?? createPrdId("dialogue-session");
    const nextSessionTitle =
      content.length > 0 ? content.slice(0, 18) : (dialogueAttachments[0]?.name ?? "新对话");

    const messageAttachments =
      dialogueAttachments.length > 0 ? dialogueAttachments.map(buildPrdAttachmentItem) : undefined;

    const nextUserMessage = {
      id: createPrdId("dialogue"),
      role: "user" as const,
      author: "你",
      content: content || "已发送附件，请结合文件内容继续处理。",
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
            preview: nextUserMessage.content,
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
        preview: nextUserMessage.content,
        updatedAt: "刚刚",
        messages: [...currentSession.messages, nextUserMessage],
      };
      return [nextSession, ...prev.filter(item => item.id !== targetSessionId)];
    });

    setActiveDialogueSessionId(targetSessionId);
    setDialogueInputValue("");
    dialogueAttachments.forEach(revokePrdComposerAttachmentPreview);
    setDialogueAttachments([]);
    setRespondingDialogueSessionId(targetSessionId);

    if (dialogueTimerRef.current !== null) {
      window.clearTimeout(dialogueTimerRef.current);
    }

    const responseText =
      activeEmployee.connectionMode === "cloud"
        ? "已继续在云端工作站中执行，我会同步整理结果，并在需要扫码或查看桌面时提醒你。"
        : "已在本地工作模式下继续处理，本轮不展示虚拟机桌面，结果会直接回流到对话和成果面板。";

    dialogueTimerRef.current = window.setTimeout(() => {
      const nextAssistantMessage = {
        id: createPrdId("dialogue"),
        role: "assistant" as const,
        author: activeEmployee.name,
        content: `${responseText} 同时我会把相关事项同步到自动化任务和 AI 专家团页，方便继续追踪。`,
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
      setRespondingDialogueSessionId(null);
      dialogueTimerRef.current = null;
    }, 1200);
  }, [
    activeDialogueSession,
    activeEmployee.connectionMode,
    activeEmployee.id,
    activeEmployee.name,
    dialogueAttachments,
    dialogueInputValue,
  ]);

  const handleStopDialogue = useCallback((): void => {
    if (!isDialogueResponding || !activeDialogueSession) return;
    if (dialogueTimerRef.current !== null) {
      window.clearTimeout(dialogueTimerRef.current);
      dialogueTimerRef.current = null;
    }
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
            id: createPrdId("dialogue"),
            role: "system",
            author: "系统",
            content: "本轮对话已被手动终止。你可以继续补充信息后重新发送。",
            timeLabel: "刚刚",
          },
        ],
      };
      return [nextSession, ...prev.filter(item => item.id !== activeDialogueSession.id)];
    });
  }, [activeDialogueSession, isDialogueResponding]);

  const handleCreateWorkspace = useCallback((): void => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    const presetInfo = getWorkspacePresetInfo(newWorkspaceType);
    const editingWorkspace = editingWorkspaceId
      ? (workspaces.find(item => item.id === editingWorkspaceId) ?? null)
      : null;
    const activationInfo =
      newWorkspaceType === "edge"
        ? editingWorkspace?.type === "edge" && editingWorkspace.activationCode
          ? {
              activationCode: editingWorkspace.activationCode,
              activationExpiresAt: editingWorkspace.activationExpiresAt,
              activationValidDays: editingWorkspace.activationValidDays,
              activationHint: editingWorkspace.activationHint,
            }
          : createPrdWorkspaceActivationInfo()
        : {
            activationCode: undefined,
            activationExpiresAt: undefined,
            activationValidDays: undefined,
            activationHint: undefined,
          };

    if (workspaceModalMode === "edit" && editingWorkspaceId) {
      setWorkspaces(prev =>
        prev.map(item =>
          item.id === editingWorkspaceId
            ? {
                ...item,
                name,
                type: newWorkspaceType,
                ...presetInfo,
                ...activationInfo,
              }
            : item,
        ),
      );
      setEmployees(prev =>
        prev.map(item =>
          item.workspaceId === editingWorkspaceId
            ? {
                ...item,
                connectionMode: newWorkspaceType === "cloud" ? "cloud" : "local",
                status: newWorkspaceType === "edge" ? "paused" : item.status,
              }
            : item,
        ),
      );
    } else {
      const nextWorkspaceId = createPrdId("workspace");
      const nextWorkspace: WorkspaceItem = {
        id: nextWorkspaceId,
        name,
        type: newWorkspaceType,
        ...presetInfo,
        ...activationInfo,
      };
      setWorkspaces(prev => [nextWorkspace, ...prev]);
      setActiveWorkspaceId(nextWorkspaceId);
    }
    setNewWorkspaceName("");
    setNewWorkspaceType("cloud");
    setWorkspaceModalMode(null);
    setEditingWorkspaceId(null);
    setIsCreateWorkspaceModalOpen(false);
  }, [editingWorkspaceId, newWorkspaceType, newWorkspaceName, workspaceModalMode, workspaces]);

  const handleCopyWorkspaceActivationCode = useCallback(
    async (workspaceId: string): Promise<void> => {
      const targetWorkspace = workspaces.find(item => item.id === workspaceId);
      const activationCode = targetWorkspace?.activationCode?.trim();
      if (!activationCode) return;

      try {
        await navigator.clipboard.writeText(activationCode);
        message.success("激活码已复制");
      } catch {
        message.error("复制激活码失败");
      }
    },
    [workspaces],
  );

  const handleRegenerateWorkspaceActivationCode = useCallback((workspaceId: string): void => {
    setWorkspaces(prev =>
      prev.map(item =>
        item.id === workspaceId
          ? {
              ...item,
              ...createPrdWorkspaceActivationInfo(),
              activationHint: "已重新生成激活码，旧码已失效，请改用新的激活码完成接入。",
            }
          : item,
      ),
    );
    message.success("已重新生成激活码");
  }, []);

  const handleCreateEmployee = useCallback((): void => {
    const name = newEmployeeName.trim();
    const role = newEmployeeRole.trim();
    if (!name || !role) return;
    if (employeeModalMode === "edit" && editingEmployeeId) {
      setEmployees(prev =>
        prev.map(item =>
          item.id === editingEmployeeId
            ? {
                ...item,
                name,
                role,
                lastAction: "刚刚编辑了专家信息",
              }
            : item,
        ),
      );
    } else {
      const nextEmployeeId = createPrdId("employee");
      const nextEmployee: EmployeeItem = {
        id: nextEmployeeId,
        name,
        avatarUrl: newEmployeeAvatarUrl || getPrdAvatarUrl(nextEmployeeId),
        role,
        status: activeWorkspace.type === "edge" ? "paused" : "idle",
        workspaceId: activeWorkspace.id,
        connectionMode: activeWorkspace.type === "cloud" ? "cloud" : "local",
        model: newEmployeeModel,
        summary: "可继续补充人设、技能和自动化任务。",
        lastAction: "刚刚创建，等待开始接收任务",
      };
      setEmployees(prev => [nextEmployee, ...prev]);
      setActiveEmployeeId(nextEmployeeId);
    }
    setNewEmployeeName("");
    setNewEmployeeRole("");
    setNewEmployeeModel(WORKSPACE_MODEL_OPTIONS[0].label);
    setNewEmployeeAvatarUrl(PRD_EMPLOYEE_AVATAR_PRESETS[0]);
    setEmployeeModalMode(null);
    setEditingEmployeeId(null);
    setIsCreateEmployeeModalOpen(false);
  }, [
    activeWorkspace.id,
    activeWorkspace.type,
    editingEmployeeId,
    employeeModalMode,
    newEmployeeAvatarUrl,
    newEmployeeName,
    newEmployeeModel,
    newEmployeeRole,
  ]);

  const handleOpenCreateWorkspaceModal = useCallback((): void => {
    setWorkspaceModalMode("create");
    setEditingWorkspaceId(null);
    setNewWorkspaceName("");
    setNewWorkspaceType("cloud");
    setIsCreateWorkspaceModalOpen(true);
  }, []);

  const handleCloseCreateWorkspaceModal = useCallback((): void => {
    setWorkspaceModalMode(null);
    setEditingWorkspaceId(null);
    setNewWorkspaceName("");
    setNewWorkspaceType("cloud");
    setIsCreateWorkspaceModalOpen(false);
  }, []);

  const handleOpenCreateEmployeeModal = useCallback((): void => {
    setEmployeeModalMode("create");
    setEditingEmployeeId(null);
    setNewEmployeeName("");
    setNewEmployeeRole("");
    setNewEmployeeModel(WORKSPACE_MODEL_OPTIONS[0].label);
    setNewEmployeeAvatarUrl(PRD_EMPLOYEE_AVATAR_PRESETS[0]);
    setIsCreateEmployeeModalOpen(true);
  }, []);

  const handleCloseCreateEmployeeModal = useCallback((): void => {
    setEmployeeModalMode(null);
    setEditingEmployeeId(null);
    setNewEmployeeName("");
    setNewEmployeeRole("");
    setNewEmployeeModel(WORKSPACE_MODEL_OPTIONS[0].label);
    setNewEmployeeAvatarUrl(PRD_EMPLOYEE_AVATAR_PRESETS[0]);
    setIsCreateEmployeeModalOpen(false);
  }, []);

  const handleEditWorkspace = useCallback(
    (workspaceId: string): void => {
      const targetWorkspace = workspaces.find(item => item.id === workspaceId);
      if (!targetWorkspace) return;
      setWorkspaceModalMode("edit");
      setEditingWorkspaceId(workspaceId);
      setNewWorkspaceName(targetWorkspace.name);
      setNewWorkspaceType(targetWorkspace.type);
      setIsCreateWorkspaceModalOpen(true);
    },
    [workspaces],
  );

  const handleRemoveWorkspace = useCallback(
    (workspaceId: string): void => {
      const hasRemainingWorkspace = workspaces.length > 1;
      const hasRemainingEmployee = employees.some(item => item.workspaceId !== workspaceId);
      if (!hasRemainingWorkspace || !hasRemainingEmployee) return;

      const nextWorkspaces = workspaces.filter(item => item.id !== workspaceId);
      const removedEmployeeIds = employees
        .filter(item => item.workspaceId === workspaceId)
        .map(item => item.id);
      const removedEmployeeIdSet = new Set(removedEmployeeIds);
      const nextEmployees = employees.filter(item => item.workspaceId !== workspaceId);
      const nextSessions = dialogueSessions.filter(
        item => !removedEmployeeIdSet.has(item.employeeId),
      );

      setWorkspaces(nextWorkspaces);
      setEmployees(nextEmployees);
      setDialogueSessions(nextSessions);

      if (activeWorkspaceId === workspaceId && nextWorkspaces[0]) {
        setActiveWorkspaceId(nextWorkspaces[0].id);
      }

      if (removedEmployeeIdSet.has(activeEmployeeId) && nextEmployees[0]) {
        setActiveEmployeeId(nextEmployees[0].id);
      }

      if (
        activeDialogueSessionId &&
        !nextSessions.some(item => item.id === activeDialogueSessionId)
      ) {
        setActiveDialogueSessionId(nextSessions[0]?.id ?? "");
      }
    },
    [
      activeDialogueSessionId,
      activeEmployeeId,
      activeWorkspaceId,
      dialogueSessions,
      employees,
      workspaces,
    ],
  );

  const handleEditEmployee = useCallback(
    (employeeId: string): void => {
      const targetEmployee = employees.find(item => item.id === employeeId);
      if (!targetEmployee) return;
      setEmployeeModalMode("edit");
      setEditingEmployeeId(employeeId);
      setNewEmployeeName(targetEmployee.name);
      setNewEmployeeRole(targetEmployee.role);
      setNewEmployeeModel(targetEmployee.model);
      setNewEmployeeAvatarUrl(targetEmployee.avatarUrl || PRD_EMPLOYEE_AVATAR_PRESETS[0]);
      setIsCreateEmployeeModalOpen(true);
    },
    [employees],
  );

  const handleEmployeeAvatarFileSelect = useCallback((file: File | null): void => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) {
        setNewEmployeeAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveEmployee = useCallback(
    (employeeId: string): void => {
      if (employees.length <= 1) return;
      const nextEmployees = employees.filter(item => item.id !== employeeId);
      const nextSessions = dialogueSessions.filter(item => item.employeeId !== employeeId);
      setEmployees(nextEmployees);
      setDialogueSessions(nextSessions);

      if (activeEmployeeId === employeeId && nextEmployees[0]) {
        setActiveEmployeeId(nextEmployees[0].id);
      }

      if (
        activeDialogueSessionId &&
        !nextSessions.some(item => item.id === activeDialogueSessionId)
      ) {
        setActiveDialogueSessionId(nextSessions[0]?.id ?? "");
      }
    },
    [activeDialogueSessionId, activeEmployeeId, dialogueSessions, employees],
  );

  const handleUpdateEmployeeModel = useCallback((employeeId: string, model: string): void => {
    setEmployees(prev => prev.map(item => (item.id === employeeId ? { ...item, model } : item)));
  }, []);

  const renderContent = (): JSX.Element => {
    if (activeTabKey === "dialogue") {
      return (
        <DialoguePrototypeView
          activeEmployee={activeEmployee}
          activeDialogueArtifacts={activeDialogueArtifacts}
          activeDialogueSession={activeDialogueSession}
          activeWorkspace={activeWorkspace}
          allEmployees={employees}
          allWorkspaces={workspaces}
          dialogueAttachments={dialogueAttachments}
          dialogueInputValue={dialogueInputValue}
          dialogueMessages={dialogueMessages}
          dialogueSessions={employeeDialogueSessions}
          isDialogueResponding={isDialogueResponding}
          onCreateDialogueSession={handleCreateDialogueSession}
          onDialogueAttachmentsSelected={handleDialogueAttachmentsSelected}
          onDialogueInputChange={setDialogueInputValue}
          onDialogueSessionSelect={handleSelectDialogueSession}
          onRemoveDialogueSession={handleRemoveDialogueSession}
          onRenameDialogueSession={handleRenameDialogueSession}
          onEmployeeSelect={handleSelectEmployee}
          onRemoveAttachment={handleRemoveDialogueAttachment}
          onSendDialogue={handleSendDialogue}
          onStopDialogue={handleStopDialogue}
          workspaceEmployees={workspaceEmployees}
        />
      );
    }
    if (activeTabKey === "group") {
      return <GroupPrototypeView />;
    }
    if (activeTabKey === "skills") {
      return <SkillMarketplaceView />;
    }
    if (activeTabKey === "automation") {
      return <PrdAutomationTaskView />;
    }
    return (
      <ExpertsPrototypeView
        activeWorkspace={activeWorkspace}
        isCreateEmployeeModalOpen={isCreateEmployeeModalOpen}
        isCreateWorkspaceModalOpen={isCreateWorkspaceModalOpen}
        employeeModalMode={employeeModalMode}
        newEmployeeName={newEmployeeName}
        newEmployeeRole={newEmployeeRole}
        newEmployeeAvatarUrl={newEmployeeAvatarUrl}
        newEmployeeModel={newEmployeeModel}
        newWorkspaceName={newWorkspaceName}
        newWorkspaceType={newWorkspaceType}
        onEditEmployee={handleEditEmployee}
        onEditWorkspace={handleEditWorkspace}
        onEmployeeAvatarChange={setNewEmployeeAvatarUrl}
        onEmployeeAvatarFileSelect={handleEmployeeAvatarFileSelect}
        onCloseCreateEmployeeModal={handleCloseCreateEmployeeModal}
        onCloseCreateWorkspaceModal={handleCloseCreateWorkspaceModal}
        onCreateEmployee={handleCreateEmployee}
        onCreateWorkspace={handleCreateWorkspace}
        onEmployeeModelChange={setNewEmployeeModel}
        onEmployeeNameChange={setNewEmployeeName}
        onEmployeeRoleChange={setNewEmployeeRole}
        onOpenCreateEmployeeModal={handleOpenCreateEmployeeModal}
        onOpenCreateWorkspaceModal={handleOpenCreateWorkspaceModal}
        onRemoveEmployee={handleRemoveEmployee}
        onRemoveWorkspace={handleRemoveWorkspace}
        onCopyWorkspaceActivationCode={handleCopyWorkspaceActivationCode}
        onRegenerateWorkspaceActivationCode={handleRegenerateWorkspaceActivationCode}
        onUpdateEmployeeModel={handleUpdateEmployeeModel}
        onWorkspaceNameChange={setNewWorkspaceName}
        onWorkspaceSelect={setActiveWorkspaceId}
        onWorkspaceTypeChange={setNewWorkspaceType}
        skillCountByEmployeeId={skillCountByEmployeeId}
        canRemoveEmployee={employees.length > 1}
        canRemoveWorkspace={workspaces.length > 1}
        workspaceModalMode={workspaceModalMode}
        workspaceEmployees={workspaceEmployees}
        workspaces={workspaces}
      />
    );
  };

  return (
    <div className={styles.page}>
      <aside className={classNames(styles.sidebar, styles.sidebarCollapsed)}>
        <div className={classNames(styles.sidebarTop, styles.sidebarTopCollapsed)}>
          <div className={classNames(styles.brandCard, styles.brandCardCollapsed)}>
            <div className={styles.brandLogo}>
              <CloudServerOutlined />
            </div>
          </div>
        </div>

        <div className={classNames(styles.sidebarSection, styles.sidebarSectionCollapsed)}>
          {SYNCLAW_TABS.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(styles.tabButton, {
                [styles.isActiveTab]: item.key === activeTabKey,
                [styles.tabButtonCollapsed]: true,
              })}
              onClick={() => setActiveTabKey(item.key)}
            >
              <span className={styles.tabIcon}>{item.icon}</span>
              <span className={styles.tabLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <div
            className={classNames(styles.content, {
              [styles.featureContent]: activeTabKey === "skills" || activeTabKey === "automation",
            })}
          >
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrdPage;
