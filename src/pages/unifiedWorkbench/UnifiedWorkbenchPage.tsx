import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  ApartmentOutlined,
  CodeOutlined,
  ReadOutlined,
  LogoutOutlined,
  MessageOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getAdminManagementPath,
  getLoginPath,
  rechargeMockTenantPoints,
  getSystemEntries,
  getTenantEntries,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import type { MockPointsPackageOption } from "@/feature/points/types";
import {
  EVOLUTION_LAB_LABEL,
  EXPERT_PLAZA_LABEL,
  EXPERT_STUDIO_LABEL,
  MANAGEMENT_CONSOLE_LABEL,
  MA_WORKBENCH_LABEL,
  PRODUCT_LOGO_TEXT,
  PRODUCT_NAME,
  SKILL_CENTER_LABEL,
} from "@/constants/brand";
import { AccountDropdownPanel } from "@/pages/components/AccountDropdownPanel";
import { TenantPointsRechargeModal } from "@/pages/components/TenantPointsRechargeModal";
import { TenantReferralInviteModal } from "@/pages/components/TenantReferralInviteModal";
import type { FrontisWebRole } from "@/pages/types";
import { getMetaagentAvatarUrl } from "@/pages/utils";

import styles from "./UnifiedWorkbenchPage.module.less";

const META_AGENT_NAV_AVATAR_URL = getMetaagentAvatarUrl("employee-writer");

type UnifiedWorkbenchTabKey =
  | "metaAgent"
  | "expertStudio"
  | "frontisDev"
  | "skillMarket"
  | "agentStore";

interface UnifiedWorkbenchPageProps {
  viewRole: FrontisWebRole;
}

interface UnifiedWorkbenchNavItem {
  key: UnifiedWorkbenchTabKey;
  label: string;
  description: string;
  icon: JSX.Element;
}

const DEFAULT_TAB_KEY: UnifiedWorkbenchTabKey = "metaAgent";
const FrontisPage = lazy(() => import("@/pages/FrontisPage"));
const FdeAgentDevView = lazy(() =>
  import("@/feature/fde/components/FdeAgentDevView").then(module => ({
    default: module.FdeAgentDevView,
  })),
);
const FdeSkillMarketView = lazy(() =>
  import("@/feature/fde/components/FdeSkillMarketView").then(module => ({
    default: module.FdeSkillMarketView,
  })),
);
const FdeAgentStoreView = lazy(() =>
  import("@/feature/fde/components/FdeAgentStoreView").then(module => ({
    default: module.FdeAgentStoreView,
  })),
);
const TAB_SEGMENTS: Record<UnifiedWorkbenchTabKey, string> = {
  metaAgent: "meta-agent",
  expertStudio: "expert-studio",
  frontisDev: "frontis-dev",
  skillMarket: "skill-market",
  agentStore: "agent-store",
};
const TAB_ITEMS: UnifiedWorkbenchNavItem[] = [
  {
    key: "metaAgent",
    label: MA_WORKBENCH_LABEL,
    description: "默认协同入口，持续承接同一条工作线程。",
    icon: (
      <Avatar src={META_AGENT_NAV_AVATAR_URL} size={28} className={styles.navAvatar}>
        M
      </Avatar>
    ),
  },
  {
    key: "expertStudio",
    label: EXPERT_STUDIO_LABEL,
    description: "进入其他 AI 专家的多 topic 工作模式。",
    icon: <MessageOutlined />,
  },
  {
    key: "agentStore",
    label: EXPERT_PLAZA_LABEL,
    description: "浏览当前租户可见并可添加使用的 AI 专家。",
    icon: <AppstoreOutlined />,
  },
  {
    key: "skillMarket",
    label: SKILL_CENTER_LABEL,
    description: "查看并管理 Skill 资产。",
    icon: <ThunderboltOutlined />,
  },
  {
    key: "frontisDev",
    label: EVOLUTION_LAB_LABEL,
    description: "进入 Agent 开发工作区。",
    icon: <CodeOutlined />,
  },
];
const USER_MANUAL_ROUTE_PATH = "/user-manual";

const getTabKeyFromPath = (tabPath?: string): UnifiedWorkbenchTabKey | null => {
  if (!tabPath) {
    return null;
  }

  const matchedItem = TAB_ITEMS.find(item => TAB_SEGMENTS[item.key] === tabPath);
  return matchedItem?.key ?? null;
};

const getUnifiedWorkbenchPath = (
  viewRole: FrontisWebRole,
  tabKey: UnifiedWorkbenchTabKey,
): string => {
  const basePath = viewRole === "admin" ? "/web/admin/workspace" : "/web/employee";
  return `${basePath}/${TAB_SEGMENTS[tabKey]}`;
};

/**
 * 统一用户端页面，聚合员工对话工作台与 FDE 开发视图。
 */
export const UnifiedWorkbenchPage = ({ viewRole }: UnifiedWorkbenchPageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabPath } = useParams<{ tabPath?: string }>();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();
  const isAdminIdentity = activeIdentity?.role === "admin" || session?.role === "admin";
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [isReferralInviteModalOpen, setIsReferralInviteModalOpen] = useState<boolean>(false);
  const [referralStrategy, setReferralStrategy] = useState(() =>
    loadOperationsRegistrationStrategy(),
  );
  const [tenantSnapshot, setTenantSnapshot] = useState<MockTenantManagementSnapshot | null>(() =>
    getMockTenantManagementSnapshot(activeIdentity?.tenantId),
  );

  const routeTab = useMemo<UnifiedWorkbenchTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const activeTab = routeTab ?? DEFAULT_TAB_KEY;
  const activeTabItem = useMemo<UnifiedWorkbenchNavItem>(
    () => TAB_ITEMS.find(item => item.key === activeTab) ?? TAB_ITEMS[0],
    [activeTab],
  );
  useEffect(() => {
    if (routeTab) {
      return;
    }

    navigate(getUnifiedWorkbenchPath(viewRole, DEFAULT_TAB_KEY), { replace: true });
  }, [navigate, routeTab, viewRole]);

  useEffect(() => {
    setTenantSnapshot(getMockTenantManagementSnapshot(activeIdentity?.tenantId));
  }, [activeIdentity?.tenantId]);

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
  const handleOpenUserManual = useCallback((): void => {
    setIsAccountMenuOpen(false);
    window.open(USER_MANUAL_ROUTE_PATH, "_blank", "noopener,noreferrer");
  }, []);

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "open-user-manual",
      icon: <ReadOutlined />,
      label: "产品使用指南",
      onClick: handleOpenUserManual,
    },
    {
      type: "divider" as const,
    },
    ...(isAdminIdentity
      ? [
          {
            key: "open-admin-management",
            icon: <AppstoreOutlined />,
            label: MANAGEMENT_CONSOLE_LABEL,
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
      icon: <ApartmentOutlined />,
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

  const handleNavigateTab = useCallback(
    (tabKey: UnifiedWorkbenchTabKey): void => {
      if (tabKey === activeTab) {
        return;
      }

      navigate(getUnifiedWorkbenchPath(viewRole, tabKey));
    },
    [activeTab, navigate, viewRole],
  );

  const featureAccountName = activeIdentity?.subjectName ?? session?.name ?? "当前账号";
  const handleOpenRechargeModal = useCallback((): void => {
    setIsAccountMenuOpen(false);
    setIsRechargeModalOpen(true);
  }, []);
  const handleCloseRechargeModal = useCallback((): void => {
    setIsRechargeModalOpen(false);
  }, []);
  const handleOpenReferralInviteModal = useCallback((): void => {
    setReferralStrategy(loadOperationsRegistrationStrategy());
    setIsAccountMenuOpen(false);
    setIsReferralInviteModalOpen(true);
  }, []);
  const handleCloseReferralInviteModal = useCallback((): void => {
    setIsReferralInviteModalOpen(false);
  }, []);
  const handleConfirmRecharge = useCallback(
    (selectedPackage: MockPointsPackageOption): boolean => {
      if (!activeIdentity?.tenantId) {
        return false;
      }

      const nextSnapshot = rechargeMockTenantPoints(
        activeIdentity.tenantId,
        selectedPackage.points,
        featureAccountName,
        {
          title: `${selectedPackage.title}到账`,
          description: `统一扫码支付 ¥${selectedPackage.price}，购买 ${selectedPackage.points.toLocaleString("zh-CN")} 积分。`,
          packageId: selectedPackage.id,
          packageTitle: selectedPackage.title,
          price: selectedPackage.price,
          paymentChannelLabel: "统一扫码支付",
        },
      );

      if (!nextSnapshot) {
        message.warning("当前租户暂不可充值，请刷新后重试。");
        return false;
      }

      setTenantSnapshot(nextSnapshot);
      message.success(
        `${selectedPackage.title}已到账，当前积分 +${selectedPackage.points.toLocaleString(
          "zh-CN",
        )}。`,
      );
      return true;
    },
    [activeIdentity?.tenantId, featureAccountName],
  );
  const activeContent = useMemo((): JSX.Element => {
    if (activeTab === "metaAgent") {
      return <FrontisPage viewRole={viewRole} embedded={true} workspaceMode="metaAgent" />;
    }

    if (activeTab === "expertStudio") {
      return <FrontisPage viewRole={viewRole} embedded={true} workspaceMode="expertStudio" />;
    }

    if (activeTab === "frontisDev") {
      return <FdeAgentDevView onNavigate={() => handleNavigateTab("agentStore")} />;
    }

    if (activeTab === "skillMarket") {
      return <FdeSkillMarketView onNavigateToAgentDev={() => handleNavigateTab("frontisDev")} />;
    }

    if (activeTab === "agentStore") {
      return (
        <FdeAgentStoreView
          onNavigateToAgentDev={() => handleNavigateTab("frontisDev")}
          viewerRole={viewRole}
        />
      );
    }

    return <FrontisPage viewRole={viewRole} embedded={true} />;
  }, [activeTab, handleNavigateTab, viewRole]);

  const shouldShowFeatureHeader = activeTab !== "metaAgent" && activeTab !== "expertStudio";

  return (
    <div className={styles.root}>
      <aside className={styles.navRail} aria-label="统一工作台一级导航">
        <div className={styles.brandBlock}>
          <span className={styles.brandLogo}>{PRODUCT_LOGO_TEXT}</span>
          <span className={styles.brandName}>{PRODUCT_NAME}</span>
        </div>

        <nav className={styles.navList}>
          {TAB_ITEMS.map(item => (
            <button
              key={item.key}
              type="button"
              title={item.label}
              className={classNames(styles.navButton, {
                [styles.navButtonActive]: item.key === activeTab,
              })}
              onClick={() => handleNavigateTab(item.key)}
            >
              <span
                className={classNames(styles.navIcon, {
                  [styles.navIconPlain]: item.key === "metaAgent",
                })}
              >
                {item.icon}
              </span>
              <span className={styles.navText}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.navFooter}>
          <Dropdown
            menu={{ items: accountMenuItems }}
            placement="topRight"
            trigger={["click"]}
            open={isAccountMenuOpen}
            onOpenChange={setIsAccountMenuOpen}
            dropdownRender={menu => (
              <AccountDropdownPanel
                accountName={featureAccountName}
                tenantName={activeIdentity?.tenantName}
                pointsBalance={isAdminIdentity ? tenantSnapshot?.pointsBalance : undefined}
                onOpenInvite={
                  isAdminIdentity && tenantSnapshot && referralStrategy.referralEnabled
                    ? handleOpenReferralInviteModal
                    : undefined
                }
                onOpenRecharge={
                  isAdminIdentity && tenantSnapshot ? handleOpenRechargeModal : undefined
                }
                menu={menu}
              />
            )}
          >
            <button
              type="button"
              className={classNames(styles.navAccountButton, {
                [styles.navAccountButtonOpen]: isAccountMenuOpen,
              })}
              aria-label="打开账户菜单"
            >
              <Avatar className={styles.accountAvatar} size={30}>
                {featureAccountName.slice(0, 1)}
              </Avatar>
              <span className={styles.navAccountName}>{featureAccountName}</span>
            </button>
          </Dropdown>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          {shouldShowFeatureHeader ? (
            <header className={styles.featureHeader}>
              <div className={styles.featureHeaderInfo}>
                <h1 className={styles.featureHeaderTitle}>{activeTabItem.label}</h1>
              </div>
            </header>
          ) : null}

          <section
            className={classNames(styles.content, {
              [styles.featureContent]: shouldShowFeatureHeader,
            })}
          >
            <Suspense fallback={<div className={styles.loadingState}>页面加载中...</div>}>
              {activeContent}
            </Suspense>
          </section>
        </div>
      </main>

      <TenantPointsRechargeModal
        open={isRechargeModalOpen}
        pointsBalance={tenantSnapshot?.pointsBalance ?? 0}
        tenantName={activeIdentity?.tenantName}
        onCancel={handleCloseRechargeModal}
        onConfirmPurchase={handleConfirmRecharge}
      />
      {tenantSnapshot ? (
        <TenantReferralInviteModal
          accountName={featureAccountName}
          inviteeRewardPoints={referralStrategy.referralInviteeRewardPoints}
          inviterRewardPoints={referralStrategy.referralInviterRewardPoints}
          open={isReferralInviteModalOpen}
          referralRecords={tenantSnapshot.referralRecords}
          tenantCode={tenantSnapshot.tenantCode}
          onClose={handleCloseReferralInviteModal}
        />
      ) : null}
    </div>
  );
};

export default UnifiedWorkbenchPage;
