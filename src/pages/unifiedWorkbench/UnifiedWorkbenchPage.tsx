import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  ApartmentOutlined,
  CodeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  activateMockTenantSubscriptionPlan,
  getLoginPath,
  getSystemEntries,
  getSystemEntryMenuLabel,
  getTenantEntries,
  getTenantAdminManagementPath,
  rechargeMockTenantPoints,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import { resolveTenantBillingMode } from "@/feature/auth/tenantBilling";
import type { MockAuthSystemEntry } from "@/feature/auth/types";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import type { MockPointsPackageOption } from "@/feature/points/types";
import {
  EVOLUTION_LAB_LABEL,
  EXPERT_PLAZA_LABEL,
  EXPERT_STUDIO_LABEL,
  MANAGEMENT_CONSOLE_LABEL,
  MA_WORKBENCH_LABEL,
  PRODUCT_LOGO_URL,
  PRODUCT_NAME,
  PRODUCT_SLOGAN,
  SKILL_CENTER_LABEL,
} from "@/constants/brand";
import { AccountDropdownPanel } from "@/pages/components/AccountDropdownPanel";
import {
  resolveSubscriptionPlanKey,
  resolveSubscriptionPlanLabel,
  SUBSCRIPTION_PLAN_LABELS,
  getMockSubscriptionPlanPurchaseOption,
  SubscriptionPlanModal,
  type SubscriptionPlanKey,
  type SubscriptionPlanPurchaseOption,
} from "@/pages/components/SubscriptionPlanModal";
import { SubscriptionPlanPaymentModal } from "@/pages/components/SubscriptionPlanPaymentModal";
import { TenantPointsRechargeModal } from "@/pages/components/TenantPointsRechargeModal";
import { TenantReferralInviteModal } from "@/pages/components/TenantReferralInviteModal";
import type { FrontisWebRole } from "@/pages/types";

import styles from "./UnifiedWorkbenchPage.module.less";

type UnifiedWorkbenchTabKey =
  | "metaAgent"
  | "expertStudio"
  | "evolutionLab"
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
const EvolutionLabView = lazy(() =>
  import("@/feature/workbenchLab/components/EvolutionLabView").then(module => ({
    default: module.EvolutionLabView,
  })),
);
const SkillCenterView = lazy(() =>
  import("@/feature/workbenchLab/components/SkillCenterView").then(module => ({
    default: module.SkillCenterView,
  })),
);
const ExpertPlazaView = lazy(() =>
  import("@/feature/workbenchLab/components/ExpertPlazaView").then(module => ({
    default: module.ExpertPlazaView,
  })),
);
const TAB_SEGMENTS: Record<UnifiedWorkbenchTabKey, string> = {
  metaAgent: "meta-agent",
  expertStudio: "expert-studio",
  evolutionLab: "evolution-lab",
  skillMarket: "skill-market",
  agentStore: "agent-store",
};
const TAB_ITEMS: UnifiedWorkbenchNavItem[] = [
  {
    key: "metaAgent",
    label: MA_WORKBENCH_LABEL,
    description: "默认协同入口，持续承接同一条工作线程。",
    icon: <RobotOutlined />,
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
    key: "evolutionLab",
    label: EVOLUTION_LAB_LABEL,
    description: "开发 AI 专家与 Skill，并管理发布范围。",
    icon: <CodeOutlined />,
  },
];
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
 * 统一用户端页面，聚合 ME、专家列表、专家广场、技能中心与进化实验室。
 */
export const UnifiedWorkbenchPage = ({ viewRole }: UnifiedWorkbenchPageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabPath } = useParams<{ tabPath?: string }>();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();
  const { loginByAccountId: loginOperationsByAccountId } = useOperationsAuth();
  const isAdminIdentity = activeIdentity?.role === "admin" || session?.role === "admin";
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isReferralInviteModalOpen, setIsReferralInviteModalOpen] = useState<boolean>(false);
  const [isPointsRechargeModalOpen, setIsPointsRechargeModalOpen] = useState<boolean>(false);
  const [isSubscriptionPlanModalOpen, setIsSubscriptionPlanModalOpen] = useState<boolean>(false);
  const [pendingSubscriptionPurchase, setPendingSubscriptionPurchase] =
    useState<SubscriptionPlanPurchaseOption | null>(null);
  const [subscriptionPlanOverrideKey, setSubscriptionPlanOverrideKey] =
    useState<SubscriptionPlanKey | null>(null);
  const [tenantSnapshotRevision, setTenantSnapshotRevision] = useState<number>(0);

  const routeTab = useMemo<UnifiedWorkbenchTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const activeTab = routeTab ?? DEFAULT_TAB_KEY;
  const activeTabItem = useMemo<UnifiedWorkbenchNavItem>(
    () => TAB_ITEMS.find(item => item.key === activeTab) ?? TAB_ITEMS[0],
    [activeTab],
  );
  const tenantSnapshot = useMemo(() => {
    void tenantSnapshotRevision;

    return getMockTenantManagementSnapshot(activeIdentity?.tenantId);
  }, [activeIdentity?.tenantId, tenantSnapshotRevision]);
  const currentSubscriptionPlanKey = useMemo(
    () => subscriptionPlanOverrideKey ?? resolveSubscriptionPlanKey(tenantSnapshot),
    [subscriptionPlanOverrideKey, tenantSnapshot],
  );
  const tenantBillingMode = resolveTenantBillingMode(tenantSnapshot);
  const isTenantPointsBilling = Boolean(tenantSnapshot) && tenantBillingMode === "points";
  const shouldShowSelfServeSubscription = isTenantPointsBilling;
  const accountPlanLabel = isTenantPointsBilling
    ? resolveSubscriptionPlanLabel(tenantSnapshot, currentSubscriptionPlanKey)
    : undefined;
  const pendingSubscriptionPlan = pendingSubscriptionPurchase;
  const registrationStrategy = useMemo(() => loadOperationsRegistrationStrategy(), []);

  useEffect(() => {
    setSubscriptionPlanOverrideKey(null);
  }, [activeIdentity?.tenantId]);

  useEffect(() => {
    if (shouldShowSelfServeSubscription) {
      return;
    }

    setIsSubscriptionPlanModalOpen(false);
    setPendingSubscriptionPurchase(null);
  }, [shouldShowSelfServeSubscription]);

  useEffect(() => {
    if (isTenantPointsBilling) {
      return;
    }

    setIsPointsRechargeModalOpen(false);
  }, [isTenantPointsBilling]);
  useEffect(() => {
    if (routeTab) {
      return;
    }

    navigate(getUnifiedWorkbenchPath(viewRole, DEFAULT_TAB_KEY), { replace: true });
  }, [navigate, routeTab, viewRole]);

  const handleLogout = useCallback((): void => {
    const redirectPath = `${location.pathname}${location.search}`;

    logout();
    message.success("已退出模拟登录。");
    navigate(getLoginPath(redirectPath), { replace: true });
  }, [location.pathname, location.search, logout, navigate]);

  const handleSelectSubscriptionPlan = useCallback(
    (purchaseInput: Parameters<typeof getMockSubscriptionPlanPurchaseOption>[0]): void => {
      if (!isTenantPointsBilling) {
        message.info("当前租户为成本计费，不需要自助团队扩充。");
        return;
      }

      const purchaseOption = getMockSubscriptionPlanPurchaseOption(purchaseInput, tenantSnapshot);

      if (!purchaseOption) {
        message.info("当前团队席位无需购买。");
        return;
      }

      setIsSubscriptionPlanModalOpen(false);
      setPendingSubscriptionPurchase(purchaseOption);
    },
    [isTenantPointsBilling, tenantSnapshot],
  );

  const handleConfirmSubscriptionPayment = useCallback(
    (purchaseOption: SubscriptionPlanPurchaseOption): boolean => {
      if (!isTenantPointsBilling) {
        message.error("当前租户为成本计费，不支持自助团队扩充。");
        return false;
      }

      if (!activeIdentity?.tenantId) {
        message.error("当前账号未绑定租户，无法购买团队席位。");
        return false;
      }

      const nextSnapshot = activateMockTenantSubscriptionPlan(
        activeIdentity.tenantId,
        purchaseOption,
      );

      if (!nextSnapshot) {
        message.error("团队扩充购买失败，请稍后重试。");
        return false;
      }

      setSubscriptionPlanOverrideKey(null);
      setTenantSnapshotRevision(revision => revision + 1);
      message.success(`${nextSnapshot.planLabel} 已开通。`);
      return true;
    },
    [activeIdentity?.tenantId, isTenantPointsBilling],
  );

  const handleOpenPointsRecharge = useCallback((): void => {
    if (!isTenantPointsBilling) {
      message.info("当前租户为成本计费，不支持购买积分。");
      return;
    }

    setIsAccountMenuOpen(false);
    setIsPointsRechargeModalOpen(true);
  }, [isTenantPointsBilling]);

  const handleConfirmPointsRecharge = useCallback(
    (selectedPackage: MockPointsPackageOption): boolean => {
      if (!isTenantPointsBilling) {
        message.error("当前租户为成本计费，不支持购买积分。");
        return false;
      }

      if (!activeIdentity?.tenantId) {
        message.error("当前账号未绑定租户，无法购买积分。");
        return false;
      }

      const purchaserName = activeIdentity.subjectName ?? session?.name ?? "当前用户";
      const nextSnapshot = rechargeMockTenantPoints(
        activeIdentity.tenantId,
        selectedPackage.points,
        purchaserName,
        {
          title: "购买标准积分包",
          description: `购买${selectedPackage.title}，支付 ¥${selectedPackage.price} 后到账。`,
          packageId: selectedPackage.id,
          packageTitle: selectedPackage.title,
          price: selectedPackage.price,
        },
      );

      if (!nextSnapshot) {
        message.error("积分购买失败，请稍后重试。");
        return false;
      }

      setTenantSnapshotRevision(revision => revision + 1);
      message.success(`${selectedPackage.points.toLocaleString("zh-CN")} 积分已到账。`);
      return true;
    },
    [activeIdentity?.subjectName, activeIdentity?.tenantId, isTenantPointsBilling, session?.name],
  );

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
  const activeContent = useMemo((): JSX.Element => {
    if (activeTab === "metaAgent") {
      return <FrontisPage viewRole={viewRole} embedded={true} workspaceMode="metaAgent" />;
    }

    if (activeTab === "expertStudio") {
      return <FrontisPage viewRole={viewRole} embedded={true} workspaceMode="expertStudio" />;
    }

    if (activeTab === "evolutionLab") {
      return <EvolutionLabView onNavigate={() => handleNavigateTab("agentStore")} />;
    }

    if (activeTab === "skillMarket") {
      return <SkillCenterView />;
    }

    if (activeTab === "agentStore") {
      return <ExpertPlazaView />;
    }

    return <FrontisPage viewRole={viewRole} embedded={true} />;
  }, [activeTab, handleNavigateTab, viewRole]);

  const shouldShowFeatureHeader =
    activeTab !== "metaAgent" &&
    activeTab !== "expertStudio" &&
    activeTab !== "skillMarket" &&
    activeTab !== "agentStore";

  return (
    <>
      <div className={styles.root}>
        <aside
          className={classNames(styles.navRail, {
            [styles.navRailCollapsed]: isSidebarCollapsed,
          })}
          aria-label="统一工作台一级导航"
        >
          <div
            className={classNames(styles.brandBlock, {
              [styles.brandBlockCollapsed]: isSidebarCollapsed,
            })}
          >
            <div
              className={classNames(styles.brandIdentity, {
                [styles.brandIdentityCollapsed]: isSidebarCollapsed,
              })}
            >
              <img className={styles.brandLogo} src={PRODUCT_LOGO_URL} alt={PRODUCT_NAME} />
              {isSidebarCollapsed ? null : (
                <span className={styles.brandCopy}>
                  <span className={styles.brandName}>{PRODUCT_NAME}</span>
                  <span className={styles.brandSubtitle}>{PRODUCT_SLOGAN}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.sidebarToggle}
              aria-label={isSidebarCollapsed ? "展开左侧菜单" : "收起左侧菜单"}
              onClick={() => setIsSidebarCollapsed(current => !current)}
            >
              {isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>

          <nav
            className={classNames(styles.navList, {
              [styles.navListCollapsed]: isSidebarCollapsed,
            })}
          >
            {TAB_ITEMS.map(item => (
              <button
                key={item.key}
                type="button"
                title={item.label}
                className={classNames(styles.navButton, {
                  [styles.navButtonActive]: item.key === activeTab,
                  [styles.navButtonCollapsed]: isSidebarCollapsed,
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
                {isSidebarCollapsed ? null : <span className={styles.navText}>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div
            className={classNames(styles.navFooter, {
              [styles.navFooterCollapsed]: isSidebarCollapsed,
            })}
          >
            <Dropdown
              menu={{ items: accountMenuItems }}
              placement={isSidebarCollapsed ? "topRight" : "topLeft"}
              trigger={["click"]}
              open={isAccountMenuOpen}
              onOpenChange={setIsAccountMenuOpen}
              dropdownRender={menu => (
                <AccountDropdownPanel
                  accountName={featureAccountName}
                  currentPlanLabel={accountPlanLabel}
                  menu={menu}
                  onOpenInvite={
                    isTenantPointsBilling &&
                    tenantSnapshot?.deploymentMode === "publicCloud" &&
                    registrationStrategy.referralEnabled
                      ? () => setIsReferralInviteModalOpen(true)
                      : undefined
                  }
                  onOpenRecharge={isTenantPointsBilling ? handleOpenPointsRecharge : undefined}
                  onOpenSubscription={
                    shouldShowSelfServeSubscription
                      ? () => setIsSubscriptionPlanModalOpen(true)
                      : undefined
                  }
                  pointsBalance={isTenantPointsBilling ? tenantSnapshot?.pointsBalance : undefined}
                />
              )}
            >
              <button
                type="button"
                className={classNames(styles.navAccountButton, {
                  [styles.navAccountButtonOpen]: isAccountMenuOpen,
                  [styles.navAccountButtonCollapsed]: isSidebarCollapsed,
                })}
                aria-label="打开账户菜单"
              >
                <Avatar className={styles.accountAvatar} size={30}>
                  {featureAccountName.slice(0, 1)}
                </Avatar>
                {isSidebarCollapsed ? null : (
                  <span className={styles.navAccountName}>{featureAccountName}</span>
                )}
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
      </div>

      {tenantSnapshot && isTenantPointsBilling && registrationStrategy.referralEnabled ? (
        <TenantReferralInviteModal
          accountName={featureAccountName}
          inviteCode={tenantSnapshot.tenantCode}
          inviterRewardPoints={registrationStrategy.referralInviterRewardPoints}
          newUserGiftPoints={registrationStrategy.defaultGiftPoints}
          open={isReferralInviteModalOpen}
          referralRecords={tenantSnapshot.referralRecords}
          onClose={() => setIsReferralInviteModalOpen(false)}
        />
      ) : null}

      {tenantSnapshot && isTenantPointsBilling ? (
        <TenantPointsRechargeModal
          open={isPointsRechargeModalOpen}
          onCancel={() => setIsPointsRechargeModalOpen(false)}
          onConfirmPurchase={handleConfirmPointsRecharge}
        />
      ) : null}

      {shouldShowSelfServeSubscription ? (
        <SubscriptionPlanModal
          currentPlanKey={currentSubscriptionPlanKey}
          open={isSubscriptionPlanModalOpen}
          purchaseMode="addSeats"
          tenantSnapshot={tenantSnapshot}
          onClose={() => setIsSubscriptionPlanModalOpen(false)}
          onSelectPlan={handleSelectSubscriptionPlan}
        />
      ) : null}

      {shouldShowSelfServeSubscription ? (
        <SubscriptionPlanPaymentModal
          currentPlanLabel={
            accountPlanLabel ?? SUBSCRIPTION_PLAN_LABELS[currentSubscriptionPlanKey]
          }
          open={Boolean(pendingSubscriptionPurchase)}
          plan={pendingSubscriptionPlan}
          tenantName={tenantSnapshot?.tenantName}
          onCancel={() => setPendingSubscriptionPurchase(null)}
          onConfirmPayment={handleConfirmSubscriptionPayment}
        />
      ) : null}
    </>
  );
};

export default UnifiedWorkbenchPage;
