import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ApartmentOutlined,
  BellOutlined,
  CloudServerOutlined,
  ControlOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_SKILLS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";

import { AdminDashboardView } from "./components/AdminDashboardView";
import { DeviceManagementView } from "./components/DeviceManagementView";
import { NotificationCenterView } from "./components/NotificationCenterView";
import { OrganizationManagementView } from "./components/OrganizationManagementView";
import { AgentStoreView } from "./components/agentStore/AgentStoreView";
import { ModelConfigurationView } from "./components/ModelConfigurationView";
import type { EmployeeItem, FrontisWebTabItem, FrontisWebTabKey } from "./types";
import styles from "./FrontisPage.module.less";

const FRONTIS_ADMIN_TABS: FrontisWebTabItem[] = [
  {
    key: "dashboard",
    label: "驾驶舱",
    icon: <DashboardOutlined />,
    roles: ["admin"],
  },
  {
    key: "dialogue",
    label: "工作台",
    icon: <MessageOutlined />,
    roles: ["admin"],
  },
  {
    key: "store",
    label: "我的AI专家团",
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

interface FrontisAdminPageProps {
  workspacePath?: string;
}

/**
 * 老板后台管理页面。
 */
const FrontisAdminPage = ({
  workspacePath = "/web/admin/workspace",
}: FrontisAdminPageProps): JSX.Element => {
  const navigate = useNavigate();
  const { logout, session } = useMockAuth();
  const [activeTabKey, setActiveTabKey] = useState<FrontisWebTabKey>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const dialogueSessions = INITIAL_DIALOGUE_SESSIONS;
  const workspaces = INITIAL_WORKSPACES;
  const users = INITIAL_FRONTIS_WEB_USERS;

  const currentUser = useMemo(
    () =>
      users.find(item => item.id === session?.userId) ??
      users.find(item => item.role === "admin" && item.status === "active") ??
      users.find(item => item.role === "admin") ??
      null,
    [session?.userId, users],
  );

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

  const handleSelectTab = useCallback(
    (tabKey: FrontisWebTabKey): void => {
      if (tabKey === "dialogue") {
        navigate(workspacePath);
        return;
      }
      setActiveTabKey(tabKey);
    },
    [navigate, workspacePath],
  );

  const renderContent = (): JSX.Element => {
    if (activeTabKey === "dashboard") {
      return (
        <AdminDashboardView
          artifactsBySession={INITIAL_DIALOGUE_ARTIFACTS}
          dialogueSessions={dialogueSessions}
          employees={employees}
          users={users}
        />
      );
    }

    if (activeTabKey === "store") {
      return (
        <AgentStoreView
          employees={employees}
          memberNames={users.filter(item => item.status === "active").map(item => item.name)}
          onNavigateToTab={handleSelectTab}
          onUpdateEmployeeAccess={handleUpdateEmployeeAccess}
          skills={INITIAL_SKILLS}
          workspaces={workspaces}
        />
      );
    }

    if (activeTabKey === "devices") {
      return <DeviceManagementView employees={employees} users={users} workspaces={workspaces} />;
    }

    if (activeTabKey === "models") {
      return <ModelConfigurationView />;
    }

    if (activeTabKey === "organization") {
      return (
        <OrganizationManagementView
          currentUserName={currentUser?.name}
          employees={employees}
          users={users}
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
                <p className={styles.brandSubtitle}>企业管理后台</p>
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
          {FRONTIS_ADMIN_TABS.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(styles.tabButton, {
                [styles.isActiveTab]: item.key === activeTabKey,
                [styles.tabButtonCollapsed]: isSidebarCollapsed,
              })}
              onClick={() => handleSelectTab(item.key)}
            >
              <span className={styles.tabIcon}>{item.icon}</span>
              <span className={styles.tabLabel}>{item.label}</span>
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
          <div className={classNames(styles.content, styles.featureContent)}>{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default FrontisAdminPage;
