import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import {
  ApartmentOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  ControlOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Empty, message } from "antd";
import { useNavigate } from "react-router-dom";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";

import { AutomationTaskView } from "./components/AutomationTaskView";
import { BossDashboardView } from "./components/BossDashboardView";
import { DeviceManagementView } from "./components/DeviceManagementView";
import { DialoguePrototypeView } from "./components/DialoguePrototypeView";
import { AgentStoreView } from "./components/agentStore/AgentStoreView";
import { GroupPrototypeView } from "./components/GroupPrototypeView";
import { ModelConfigurationView } from "./components/ModelConfigurationView";
import { NotificationCenterView } from "./components/NotificationCenterView";
import { OrganizationManagementView } from "./components/OrganizationManagementView";
import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_SKILLS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";
import type {
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebRole,
  FrontisWebTabItem,
  FrontisWebTabKey,
  WorkspaceItem,
} from "./types";
import {
  buildAttachmentItem,
  createComposerAttachment,
  createId,
  revokeComposerAttachmentPreview,
} from "./utils";
import styles from "./FrontisPage.module.less";

const FRONTIS_WEB_TABS: FrontisWebTabItem[] = [
  {
    key: "dashboard",
    label: "驾驶舱",
    icon: <DashboardOutlined />,
    roles: ["admin"],
  },
  {
    key: "dialogue",
    label: "我的AI专家",
    labels: {
      admin: "工作台",
    },
    icon: <MessageOutlined />,
    roles: ["employee", "admin"],
  },
  {
    key: "group",
    label: "AI军团空间",
    icon: <TeamOutlined />,
    roles: ["employee"],
  },
  {
    key: "automation",
    label: "自动化",
    icon: <ClockCircleOutlined />,
    roles: ["employee"],
  },
  {
    key: "store",
    label: "AI专家团",
    labels: {
      admin: "我的AI专家团",
    },
    icon: <RobotOutlined />,
    roles: ["admin"],
  },
  {
    key: "devices",
    label: "设备管理",
    icon: <CloudServerOutlined />,
    roles: ["admin"],
  },
  {
    key: "models",
    label: "模型配置",
    icon: <ControlOutlined />,
    roles: ["admin"],
  },
  {
    key: "organization",
    label: "组织管理",
    icon: <ApartmentOutlined />,
    roles: ["admin"],
  },
  {
    key: "notifications",
    label: "通知中心",
    icon: <BellOutlined />,
    roles: ["admin"],
  },
];

interface FrontisPageProps {
  viewRole: FrontisWebRole;
}

/**
 * FrontisAI Web 原型主页面
 *
 * 当前页面通过路由区分普通用户与企业老板视图。
 */
const FrontisPage = ({ viewRole }: FrontisPageProps): JSX.Element => {
  const navigate = useNavigate();
  const { logout, session } = useMockAuth();
  const [activeTabKey, setActiveTabKey] = useState<FrontisWebTabKey>(
    viewRole === "admin" ? "dashboard" : "dialogue",
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [dialogueSessions, setDialogueSessions] =
    useState<DialogueSessionItem[]>(INITIAL_DIALOGUE_SESSIONS);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(INITIAL_EMPLOYEES[0]?.id ?? "");
  const [activeDialogueSessionId, setActiveDialogueSessionId] = useState<string>(
    INITIAL_DIALOGUE_SESSIONS.find(item => item.employeeId === INITIAL_EMPLOYEES[0]?.id)?.id ?? "",
  );
  const [dialogueInputValue, setDialogueInputValue] = useState<string>("");
  const [dialogueAttachments, setDialogueAttachments] = useState<WorkspaceComposerAttachmentItem[]>(
    [],
  );
  const [respondingDialogueSessionId, setRespondingDialogueSessionId] = useState<string | null>(
    null,
  );
  const dialogueTimerRef = useRef<number | null>(null);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);
  const workspaces: WorkspaceItem[] = INITIAL_WORKSPACES;
  const currentUser = useMemo(
    () =>
      INITIAL_FRONTIS_WEB_USERS.find(item => item.id === session?.userId) ??
      INITIAL_FRONTIS_WEB_USERS.find(
        item =>
          item.role === (viewRole === "admin" ? "admin" : "member") && item.status === "active",
      ) ??
      INITIAL_FRONTIS_WEB_USERS.find(
        item => item.role === (viewRole === "admin" ? "admin" : "member"),
      ) ??
      null,
    [session?.userId, viewRole],
  );
  const conversationEmployees = useMemo(
    () =>
      viewRole === "admin"
        ? employees
        : employees.filter(item => {
            const isAssigned = currentUser?.assignedAgentIds.includes(item.id) ?? false;
            if (!isAssigned) {
              return false;
            }
            return item.visibility === "all" || item.boundMembers.includes(currentUser?.name ?? "");
          }),
    [currentUser?.assignedAgentIds, currentUser?.name, employees, viewRole],
  );

  const visibleTabs = useMemo(
    () => FRONTIS_WEB_TABS.filter(item => item.roles.includes(viewRole)),
    [viewRole],
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
    () =>
      employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ??
      employeeDialogueSessions[0] ??
      null,
    [activeDialogueSessionId, employeeDialogueSessions],
  );

  const dialogueMessages = activeDialogueSession?.messages ?? [];
  const visibleDialogueSessions = useMemo(
    () =>
      dialogueSessions.filter(item =>
        conversationEmployees.some(employee => employee.id === item.employeeId),
      ),
    [conversationEmployees, dialogueSessions],
  );
  const activeDialogueArtifacts = useMemo(
    () =>
      activeDialogueSession ? (INITIAL_DIALOGUE_ARTIFACTS[activeDialogueSession.id] ?? []) : [],
    [activeDialogueSession],
  );
  const activeWorkspace = useMemo(
    () => workspaces.find(item => item.id === activeEmployee?.workspaceId) ?? workspaces[0] ?? null,
    [activeEmployee?.workspaceId, workspaces],
  );
  const isDialogueResponding = activeDialogueSession?.id === respondingDialogueSessionId;

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
    if (!visibleTabs.some(item => item.key === activeTabKey)) {
      setActiveTabKey(visibleTabs[0]?.key ?? "dialogue");
    }
  }, [activeTabKey, visibleTabs]);

  useEffect(() => {
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
  }, [activeDialogueSessionId, employeeDialogueSessions]);

  useEffect(() => {
    latestDialogueAttachmentsRef.current = dialogueAttachments;
  }, [dialogueAttachments]);

  useEffect(() => {
    return () => {
      if (dialogueTimerRef.current !== null) {
        window.clearTimeout(dialogueTimerRef.current);
      }
      latestDialogueAttachmentsRef.current.forEach(revokeComposerAttachmentPreview);
    };
  }, []);

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
      setActiveDialogueSessionId(nextEmployeeSessions[0]?.id ?? "");
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
    },
    [dialogueAttachments, dialogueSessions],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      setActiveDialogueSessionId(sessionId);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
    },
    [dialogueAttachments],
  );

  const handleCreateDialogueSession = useCallback((): void => {
    if (!activeEmployee) return;
    const nextSessionId = createId("dialogue-session");
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
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setDialogueInputValue("");
  }, [activeEmployee, dialogueAttachments]);

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
    if (!activeEmployee) return;
    const content = dialogueInputValue.trim();
    if (!content && dialogueAttachments.length === 0) return;

    const targetSessionId = activeDialogueSession?.id ?? createId("dialogue-session");
    const nextSessionTitle =
      content.length > 0 ? content.slice(0, 18) : (dialogueAttachments[0]?.name ?? "新对话");
    const messageAttachments =
      dialogueAttachments.length > 0 ? dialogueAttachments.map(buildAttachmentItem) : undefined;

    const nextUserMessage = {
      id: createId("dialogue"),
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
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setRespondingDialogueSessionId(targetSessionId);

    if (dialogueTimerRef.current !== null) {
      window.clearTimeout(dialogueTimerRef.current);
    }

    const responseText =
      activeEmployee.connectionMode === "cloud"
        ? "已继续在云端工作站中执行，我会同步整理结果，并在需要管理员介入或排查设备时提醒你。"
        : "已在本地工作模式下继续处理，本轮不展示远端桌面，结果会直接回流到当前对话右侧成果面板。";

    dialogueTimerRef.current = window.setTimeout(() => {
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
      setRespondingDialogueSessionId(null);
      dialogueTimerRef.current = null;
    }, 1200);
  }, [activeDialogueSession, activeEmployee, dialogueAttachments, dialogueInputValue]);

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
  }, [activeDialogueSession, isDialogueResponding]);

  const handleUpdateEmployeeAccess = useCallback(
    (employeeId: string, visibility: EmployeeItem["visibility"], boundMembers: string[]): void => {
      setEmployees(prev =>
        prev.map(item =>
          item.id === employeeId
            ? {
                ...item,
                visibility,
                boundMembers,
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleLogout = useCallback((): void => {
    logout();
    message.success("已退出模拟登录。");
    navigate("/portal", { replace: true });
  }, [logout, navigate]);

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const renderContent = (): JSX.Element => {
    if (activeTabKey === "dialogue" && activeEmployee && activeWorkspace) {
      return (
        <DialoguePrototypeView
          activeEmployee={activeEmployee}
          activeDialogueArtifacts={activeDialogueArtifacts}
          activeDialogueSession={activeDialogueSession}
          activeWorkspace={activeWorkspace}
          allEmployees={conversationEmployees}
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
        />
      );
    }

    if (activeTabKey === "dialogue") {
      return (
        <div className={styles.emptyPageState}>
          <Empty description="当前账号暂未分配 Agent，请联系管理员分配后再开始对话。" />
        </div>
      );
    }

    if (activeTabKey === "automation") {
      return (
        <AutomationTaskView
          dialogueSessions={visibleDialogueSessions}
          employees={conversationEmployees}
        />
      );
    }

    if (activeTabKey === "group") {
      return <GroupPrototypeView currentUserName={currentUser?.name} />;
    }

    if (activeTabKey === "dashboard") {
      return (
        <BossDashboardView
          currentUserName={currentUser?.name}
          dialogueSessions={dialogueSessions}
          employees={employees}
          users={INITIAL_FRONTIS_WEB_USERS}
          workspaces={workspaces}
        />
      );
    }

    if (activeTabKey === "store") {
      return (
        <AgentStoreView
          employees={employees}
          memberNames={INITIAL_FRONTIS_WEB_USERS.filter(item => item.status === "active").map(
            item => item.name,
          )}
          onNavigateToTab={setActiveTabKey}
          onUpdateEmployeeAccess={handleUpdateEmployeeAccess}
          skills={INITIAL_SKILLS}
          workspaces={workspaces}
        />
      );
    }

    if (activeTabKey === "devices") {
      return <DeviceManagementView employees={employees} workspaces={workspaces} />;
    }

    if (activeTabKey === "models") {
      return <ModelConfigurationView employees={employees} />;
    }

    if (activeTabKey === "organization") {
      return (
        <OrganizationManagementView
          currentUserName={currentUser?.name}
          employees={employees}
          users={INITIAL_FRONTIS_WEB_USERS}
        />
      );
    }

    return <NotificationCenterView />;
  };

  return (
    <div className={styles.page}>
      <aside
        className={classNames(styles.sidebar, {
          [styles.sidebarCollapsed]: isSidebarCollapsed,
        })}
      >
        <div
          className={classNames(styles.sidebarTop, {
            [styles.sidebarTopCollapsed]: isSidebarCollapsed,
          })}
        >
          <div
            className={classNames(styles.brandCard, {
              [styles.brandCardCollapsed]: isSidebarCollapsed,
            })}
          >
            <div className={styles.brandLogo}>
              <CloudServerOutlined />
            </div>
            {isSidebarCollapsed ? null : (
              <div className={styles.brandCopy}>
                <h1 className={styles.brandTitle}>Frontis AI</h1>
                <p className={styles.brandSubtitle}>
                  {viewRole === "admin" ? "企业老板端" : "AI专家协作台"}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.sidebarToggle}
            aria-label={isSidebarCollapsed ? "展开菜单栏" : "收起菜单栏"}
            onClick={() => setIsSidebarCollapsed(current => !current)}
          >
            {isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>

        <div
          className={classNames(styles.sidebarSection, {
            [styles.sidebarSectionCollapsed]: isSidebarCollapsed,
          })}
        >
          {visibleTabs.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(styles.tabButton, {
                [styles.isActiveTab]: item.key === activeTabKey,
                [styles.tabButtonCollapsed]: isSidebarCollapsed,
              })}
              onClick={() => {
                if (viewRole === "admin" && item.key === "dialogue") {
                  window.open("/web/employee", "_blank");
                  return;
                }
                setActiveTabKey(item.key);
              }}
            >
              <span className={styles.tabIcon}>{item.icon}</span>
              <span className={styles.tabLabel}>{item.labels?.[viewRole] ?? item.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sidebarBottom}>
          <Dropdown menu={{ items: accountMenuItems }} placement="topLeft" trigger={["click"]}>
            <button
              type="button"
              className={classNames(styles.accountTrigger, {
                [styles.accountTriggerExpanded]: !isSidebarCollapsed,
              })}
            >
              <Avatar className={styles.accountAvatar} size={40}>
                {currentUser ? currentUser.name.slice(0, 1) : "U"}
              </Avatar>
              <span className={styles.accountName}>{currentUser?.name ?? "未登录"}</span>
            </button>
          </Dropdown>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <div
            className={classNames(styles.content, {
              [styles.featureContent]: activeTabKey !== "dialogue" && activeTabKey !== "group",
            })}
          >
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FrontisPage;
