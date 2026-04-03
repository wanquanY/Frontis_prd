import { useCallback, useMemo } from "react";
import {
  ApiOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  MessageOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import { getAdminManagementPath } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";

import { OpenClawWorkspaceChatV2View } from "./components/OpenClawWorkspaceChatV2View";
import { OpenClawAgentsV2View } from "./components/OpenClawAgentsV2View";
import { OpenClawChannelsV2View } from "./components/OpenClawChannelsV2View";
import { OpenClawTasksV2View } from "./components/OpenClawTasksV2View";
import {
  getOpenClawV2AutomationTasks,
  getOpenClawV2Channels,
  getOpenClawV2DialogueArtifacts,
  getOpenClawV2DialogueResults,
  getOpenClawV2DialogueSessions,
  getOpenClawV2Employees,
  getOpenClawV2RemotePendingCount,
  getOpenClawV2SectionPath,
  getOpenClawV2SkillCatalog,
  getOpenClawV2Users,
  type OpenClawV2Section,
} from "./openClawV2Mock";
import type { FrontisWebRole } from "./types";
import styles from "./OpenClawWorkspaceV2Page.module.less";

interface OpenClawWorkspaceV2PageProps {
  viewRole: FrontisWebRole;
}

const MANAGEMENT_USER_ROLES = new Set(["boss", "admin"]);

interface OpenClawNavItem {
  key: OpenClawV2Section;
  label: string;
  icon: JSX.Element;
}

const OPENCLAW_NAV_ITEMS: OpenClawNavItem[] = [
  {
    key: "chat",
    label: "对话",
    icon: <MessageOutlined />,
  },
  {
    key: "agents",
    label: "AI伙伴",
    icon: <RobotOutlined />,
  },
  {
    key: "channels",
    label: "远程连接",
    icon: <ApiOutlined />,
  },
  {
    key: "tasks",
    label: "自动化",
    icon: <ClockCircleOutlined />,
  },
];

const resolveSectionFromPath = (pathname: string): OpenClawV2Section => {
  if (pathname.endsWith("/agents")) {
    return "agents";
  }
  if (pathname.endsWith("/channels")) {
    return "channels";
  }
  if (pathname.endsWith("/tasks")) {
    return "tasks";
  }

  return "chat";
};

/**
 * OpenClaw V2 工作台页面。
 */
const OpenClawWorkspaceV2Page = ({
  viewRole,
}: OpenClawWorkspaceV2PageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, session } = useMockAuth();
  const users = useMemo(() => getOpenClawV2Users(), []);
  const employees = useMemo(() => getOpenClawV2Employees(viewRole), [viewRole]);
  const skills = useMemo(() => getOpenClawV2SkillCatalog(), []);
  const channels = useMemo(() => getOpenClawV2Channels(viewRole), [viewRole]);
  const automationTasks = useMemo(() => getOpenClawV2AutomationTasks(viewRole), [viewRole]);
  const remotePendingCount = useMemo(() => getOpenClawV2RemotePendingCount(viewRole), [viewRole]);
  const activeSection = useMemo(
    () => resolveSectionFromPath(location.pathname),
    [location.pathname],
  );
  const currentUser = useMemo(
    () =>
      users.find(item => item.id === session?.userId) ??
      (viewRole === "admin"
        ? users.find(item => MANAGEMENT_USER_ROLES.has(item.role) && item.status === "active") ??
          users.find(item => MANAGEMENT_USER_ROLES.has(item.role))
        : users.find(item => item.role === "member" && item.status === "active") ??
          users.find(item => item.role === "member")) ??
      null,
    [session?.userId, users, viewRole],
  );
  const dialogueSessions = useMemo(() => getOpenClawV2DialogueSessions(viewRole), [viewRole]);
  const dialogueArtifacts = useMemo(() => getOpenClawV2DialogueArtifacts(viewRole), [viewRole]);
  const dialogueResults = useMemo(() => getOpenClawV2DialogueResults(viewRole), [viewRole]);

  const handleSelectSection = useCallback(
    (section: OpenClawV2Section): void => {
      navigate(getOpenClawV2SectionPath(viewRole, section));
    },
    [navigate, viewRole],
  );

  const handleLogout = useCallback((): void => {
    logout();
    message.success("已退出模拟登录。");
    navigate("/portal", { replace: true });
  }, [logout, navigate]);

  const handleOpenManagementPortal = useCallback((): void => {
    navigate(getAdminManagementPath("v2"));
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
    if (activeSection === "agents") {
      return <OpenClawAgentsV2View employees={employees} initialSkills={skills} />;
    }

    if (activeSection === "channels") {
      return <OpenClawChannelsV2View employees={employees} initialChannels={channels} />;
    }

    if (activeSection === "tasks") {
      return (
        <OpenClawTasksV2View
          employees={employees}
          dialogueSessions={dialogueSessions}
          initialTasks={automationTasks}
        />
      );
    }

    return (
      <OpenClawWorkspaceChatV2View
        viewRole={viewRole}
        currentUser={currentUser}
        employees={employees}
        initialSessions={dialogueSessions}
        initialArtifactsBySession={dialogueArtifacts}
        initialResultsBySession={dialogueResults}
      />
    );
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <img
            className={styles.brandImage}
            src="https://syngents-userfile-1321707147.cos.ap-beijing.myqcloud.com/images/0770c15e-58d7-4476-a330-b80e24189bc4.png"
            alt="OpenClaw"
          />
        </div>

        <div className={styles.nav}>
          {OPENCLAW_NAV_ITEMS.map(item => (
            <button
              key={item.key}
              type="button"
              className={activeSection === item.key ? styles.navItemActive : styles.navItem}
              onClick={() => handleSelectSection(item.key)}
            >
              <span className={styles.navIcon}>
                {item.icon}
                {item.key === "channels" && remotePendingCount > 0 ? (
                  <span className={styles.navBadge}>
                    {remotePendingCount > 9 ? "9+" : remotePendingCount}
                  </span>
                ) : null}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <Dropdown menu={{ items: accountMenuItems }} placement="topRight" trigger={["click"]}>
            <button type="button" className={styles.userButton}>
              <Avatar className={styles.userAvatar} size={36}>
                {currentUser?.name.slice(0, 1) ?? "U"}
              </Avatar>
              <span className={styles.userName}>{currentUser?.name ?? "未登录"}</span>
            </button>
          </Dropdown>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.contentShell}>{renderContent()}</div>
      </main>
    </div>
  );
};

export default OpenClawWorkspaceV2Page;
