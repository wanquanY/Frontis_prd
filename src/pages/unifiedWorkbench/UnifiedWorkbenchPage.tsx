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
  MoreOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Input, Modal, message } from "antd";
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
import type { MockPointsPackagePurchaseSnapshot } from "@/feature/points/types";
import {
  EVOLUTION_LAB_LABEL,
  EXPERT_PLAZA_LABEL,
  EXPERT_STUDIO_LABEL,
  MANAGEMENT_CONSOLE_LABEL,
  PRODUCT_LOGO_URL,
  PRODUCT_NAME,
  PRODUCT_SLOGAN,
  TEAM_EXPERTS_LABEL,
} from "@/constants/brand";
import { AccountDropdownPanel } from "@/pages/components/AccountDropdownPanel";
import type {
  WorkbenchConversationNavSession,
  WorkbenchConversationNavState,
} from "@/pages/FrontisPage";
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
import type { FrontisWebRole } from "@/pages/types";

import styles from "./UnifiedWorkbenchPage.module.less";

type UnifiedWorkbenchTabKey = "expertStudio" | "evolutionLab" | "agentStore" | "teamExperts";

interface UnifiedWorkbenchPageProps {
  viewRole: FrontisWebRole;
}

interface UnifiedWorkbenchNavItem {
  key: UnifiedWorkbenchTabKey;
  label: string;
  description: string;
  icon: JSX.Element;
}

const DEFAULT_TAB_KEY: UnifiedWorkbenchTabKey = "expertStudio";
const MAX_CONVERSATION_NAV_TITLE_LENGTH = 18;
const FrontisPage = lazy(() => import("@/pages/FrontisPage"));
const EvolutionLabView = lazy(() =>
  import("@/feature/workbenchLab/components/EvolutionLabView").then(module => ({
    default: module.EvolutionLabView,
  })),
);
const AssetCatalogView = lazy(() =>
  import("@/feature/workbenchLab/components/AssetCatalogView").then(module => ({
    default: module.AssetCatalogView,
  })),
);
const TAB_SEGMENTS: Record<UnifiedWorkbenchTabKey, string> = {
  expertStudio: "expert-studio",
  evolutionLab: "evolution-lab",
  agentStore: "agent-store",
  teamExperts: "team-experts",
};
const MOBILE_WORKBENCH_BREAKPOINT = 900;
const truncateConversationNavTitle = (title: string): string => {
  const normalizedTitle = title.trim();

  return normalizedTitle.length > MAX_CONVERSATION_NAV_TITLE_LENGTH
    ? `${normalizedTitle.slice(0, MAX_CONVERSATION_NAV_TITLE_LENGTH)}...`
    : normalizedTitle;
};

const TAB_ITEMS: UnifiedWorkbenchNavItem[] = [
  {
    key: "expertStudio",
    label: EXPERT_STUDIO_LABEL,
    description: "以 ME 为入口创建多 session 会话，并调度可用 AI 专家。",
    icon: <MessageOutlined />,
  },
  {
    key: "teamExperts",
    label: TEAM_EXPERTS_LABEL,
    description: "查看团队共享和自己开发的 AI 专家、Skill 和 MCP。",
    icon: <TeamOutlined />,
  },
  {
    key: "agentStore",
    label: EXPERT_PLAZA_LABEL,
    description: "浏览平台预置与运营上架的 AI 专家、Skill 和 MCP。",
    icon: <AppstoreOutlined />,
  },
  {
    key: "evolutionLab",
    label: EVOLUTION_LAB_LABEL,
    description: "开发 AI 专家与 Skill，并管理发布范围。",
    icon: <CodeOutlined />,
  },
];

const DEFAULT_WORKBENCH_CONVERSATION_RECORDS: WorkbenchConversationNavSession[] = [
  {
    id: "dialogue-seed-metaagent-collab",
    title: "ME 持续对话",
    updatedAt: "11:22",
    active: false,
    avatarName: "ME",
  },
  {
    id: "dialogue-seed-metaagent-weekly-task-plan",
    title: "本周任务编排",
    updatedAt: "今天 20:12",
    active: false,
    avatarName: "ME",
  },
  {
    id: "dialogue-seed-sales-script-intent",
    title: "客户异议话术整理",
    updatedAt: "今天 20:18",
    active: false,
    avatarName: "销售话术助手",
  },
  {
    id: "dialogue-seed-metaagent-store-experience",
    title: "专家广场体验优化",
    updatedAt: "今天 20:27",
    active: false,
    avatarName: "ME",
  },
  {
    id: "dialogue-seed-opportunity-stalled",
    title: "重点商机停滞预警",
    updatedAt: "今天 20:36",
    active: false,
    avatarName: "商机跟进提醒",
  },
  {
    id: "dialogue-seed-metaagent-expert-detail-rules",
    title: "专家详情规则梳理",
    updatedAt: "今天 20:43",
    active: false,
    avatarName: "ME",
  },
  {
    id: "dialogue-seed-delivery-weekly-risk",
    title: "本周交付风险周报",
    updatedAt: "今天 20:52",
    active: false,
    avatarName: "项目交付助手",
  },
  {
    id: "dialogue-seed-metaagent-skill-file-preview",
    title: "技能文件预览校准",
    updatedAt: "今天 21:01",
    active: false,
    avatarName: "ME",
  },
  {
    id: "dialogue-seed-metaagent-task-record-menu",
    title: "对话记录菜单调整",
    updatedAt: "今天 21:18",
    active: false,
    avatarName: "ME",
  },
  {
    id: "dialogue-seed-metaagent-evolution-data",
    title: "进化数据口径复盘",
    updatedAt: "今天 21:36",
    active: false,
    avatarName: "ME",
  },
];

const formatConversationRecordTime = (updatedAt: string): string => {
  const normalizedTime = updatedAt.trim();

  if (!normalizedTime) {
    return "";
  }

  const todayTimeMatch = /^今天\s+(\d{1,2}:\d{2})$/.exec(normalizedTime);
  if (todayTimeMatch) {
    return todayTimeMatch[1];
  }

  if (/^\d{1,2}:\d{2}$/.test(normalizedTime) || normalizedTime === "刚刚") {
    return normalizedTime;
  }

  if (normalizedTime === "昨天" || /^昨天\s+\d{1,2}:\d{2}$/.test(normalizedTime)) {
    return "1 天";
  }

  const dayOffsetMatch = /^(\d+)天前$/.exec(normalizedTime);
  if (dayOffsetMatch) {
    return `${dayOffsetMatch[1]} 天`;
  }

  return normalizedTime;
};

const getTabKeyFromPath = (tabPath?: string): UnifiedWorkbenchTabKey | null => {
  if (!tabPath) {
    return null;
  }

  if (tabPath === "meta-agent") {
    return DEFAULT_TAB_KEY;
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
 * 统一用户端页面，聚合新对话、专家广场、企业专区与进化实验室。
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
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const [isPointsRechargeModalOpen, setIsPointsRechargeModalOpen] = useState<boolean>(false);
  const [isSubscriptionPlanModalOpen, setIsSubscriptionPlanModalOpen] = useState<boolean>(false);
  const [pendingSubscriptionPurchase, setPendingSubscriptionPurchase] =
    useState<SubscriptionPlanPurchaseOption | null>(null);
  const [subscriptionPlanOverrideKey, setSubscriptionPlanOverrideKey] =
    useState<SubscriptionPlanKey | null>(null);
  const [tenantSnapshotRevision, setTenantSnapshotRevision] = useState<number>(0);
  const [expertStudioResetKey, setExpertStudioResetKey] = useState<number>(0);
  const [conversationNavState, setConversationNavState] =
    useState<WorkbenchConversationNavState | null>(null);
  const [fallbackConversationRecords, setFallbackConversationRecords] = useState<
    WorkbenchConversationNavSession[]
  >(() => DEFAULT_WORKBENCH_CONVERSATION_RECORDS);
  const [pendingConversationSessionId, setPendingConversationSessionId] = useState<string | null>(
    null,
  );
  const [pendingWorkbenchAgentId, setPendingWorkbenchAgentId] = useState<string | null>(null);
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
  const isMobileWorkbench = viewportWidth <= MOBILE_WORKBENCH_BREAKPOINT;

  useEffect(() => {
    const handleResize = (): void => setViewportWidth(window.innerWidth);

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    if (tabPath !== "meta-agent") {
      return;
    }

    navigate(getUnifiedWorkbenchPath(viewRole, DEFAULT_TAB_KEY), { replace: true });
  }, [navigate, tabPath, viewRole]);

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
    (purchaseSnapshot: MockPointsPackagePurchaseSnapshot): boolean => {
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
        purchaseSnapshot.totalPoints,
        purchaserName,
        {
          basePoints: purchaseSnapshot.basePoints,
          discountAmount: purchaseSnapshot.discountAmount,
          discountFactor: purchaseSnapshot.discountFactor,
          giftPoints: purchaseSnapshot.giftPoints,
          originalPrice: purchaseSnapshot.originalPrice,
          packageId: purchaseSnapshot.packageId,
          packageTitle: purchaseSnapshot.packageTitle,
          price: purchaseSnapshot.payableAmount,
          promotionEndsAt: purchaseSnapshot.promotionEndsAt,
          title: `购买${purchaseSnapshot.packageTitle}`,
          description: `购买${purchaseSnapshot.packageTitle}，支付 ¥${purchaseSnapshot.payableAmount} 后到账。`,
        },
      );

      if (!nextSnapshot) {
        message.error("积分购买失败，请稍后重试。");
        return false;
      }

      setTenantSnapshotRevision(revision => revision + 1);
      message.success(`${purchaseSnapshot.totalPoints.toLocaleString("zh-CN")} 积分已到账。`);
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
        if (tabKey === "expertStudio") {
          setExpertStudioResetKey(current => current + 1);
        }
        return;
      }

      if (tabKey === "expertStudio") {
        setExpertStudioResetKey(current => current + 1);
      }
      navigate(getUnifiedWorkbenchPath(viewRole, tabKey));
    },
    [activeTab, navigate, viewRole],
  );

  const handleRenameConversationSession = useCallback(
    (sessionId: string, title: string): void => {
      let nextTitle = title;
      Modal.confirm({
        title: "重命名对话",
        icon: null,
        content: (
          <Input
            defaultValue={title}
            maxLength={30}
            onChange={event => {
              nextTitle = event.target.value;
            }}
          />
        ),
        okText: "保存",
        cancelText: "取消",
        onOk: () => {
          const normalizedTitle = nextTitle.trim();
          if (!normalizedTitle) {
            message.warning("对话名称不能为空。");
            return Promise.reject();
          }

          if (conversationNavState) {
            conversationNavState.onRenameSession(sessionId, normalizedTitle);
          } else {
            setFallbackConversationRecords(currentRecords =>
              currentRecords.map(session =>
                session.id === sessionId ? { ...session, title: normalizedTitle } : session,
              ),
            );
          }

          return undefined;
        },
      });
    },
    [conversationNavState],
  );

  const handleRemoveConversationSession = useCallback(
    (sessionId: string): void => {
      Modal.confirm({
        title: "删除对话",
        content: "删除后，该对话记录不可恢复。",
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: () => {
          if (conversationNavState) {
            conversationNavState.onRemoveSession(sessionId);
            return;
          }

          setFallbackConversationRecords(currentRecords =>
            currentRecords.filter(session => session.id !== sessionId),
          );
        },
      });
    },
    [conversationNavState],
  );

  const handleSelectConversationSession = useCallback(
    (sessionId: string): void => {
      if (activeTab !== "expertStudio") {
        setPendingConversationSessionId(sessionId);
        navigate(getUnifiedWorkbenchPath(viewRole, "expertStudio"));
        return;
      }

      if (conversationNavState) {
        conversationNavState.onSelectSession(sessionId);
      } else {
        setPendingConversationSessionId(sessionId);
      }
    },
    [activeTab, conversationNavState, navigate, viewRole],
  );

  const visibleConversationRecords = conversationNavState?.sessions ?? fallbackConversationRecords;
  const featureAccountName = activeIdentity?.subjectName ?? session?.name ?? "当前账号";
  const activeContent = useMemo((): JSX.Element => {
    if (activeTab === "expertStudio") {
      return (
        <FrontisPage
          key={`expert-studio-${expertStudioResetKey}`}
          viewRole={viewRole}
          embedded={true}
          resetSignal={expertStudioResetKey}
          workspaceMode="expertStudio"
          pendingWorkbenchConversationSessionId={pendingConversationSessionId}
          onPendingWorkbenchConversationSessionConsumed={() =>
            setPendingConversationSessionId(null)
          }
          pendingWorkbenchAgentId={pendingWorkbenchAgentId}
          onPendingWorkbenchAgentConsumed={() => setPendingWorkbenchAgentId(null)}
          onWorkbenchConversationNavChange={setConversationNavState}
        />
      );
    }

    if (activeTab === "evolutionLab") {
      return <EvolutionLabView onNavigate={() => handleNavigateTab("agentStore")} />;
    }

    if (activeTab === "agentStore") {
      return <AssetCatalogView mode="store" />;
    }

    if (activeTab === "teamExperts") {
      return <AssetCatalogView mode="team" />;
    }

    return <FrontisPage viewRole={viewRole} embedded={true} />;
  }, [
    activeTab,
    expertStudioResetKey,
    handleNavigateTab,
    pendingConversationSessionId,
    pendingWorkbenchAgentId,
    viewRole,
  ]);

  const shouldShowFeatureHeader =
    activeTab !== "expertStudio" && activeTab !== "agentStore" && activeTab !== "teamExperts";

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
                <span className={styles.navIcon}>{item.icon}</span>
                {isSidebarCollapsed ? null : <span className={styles.navText}>{item.label}</span>}
              </button>
            ))}

            {!isSidebarCollapsed ? (
              <section className={styles.navConversationPanel} aria-label="对话记录">
                <div className={styles.navConversationHeading}>对话记录</div>
                <div className={styles.navConversationList}>
                  {visibleConversationRecords.length ? (
                    visibleConversationRecords.map(session => {
                      const displayTitle = truncateConversationNavTitle(session.title);

                      return (
                        <div
                          key={session.id}
                          className={classNames(styles.navConversationSession, {
                            [styles.navConversationSessionActive]: session.active,
                          })}
                        >
                          <span className={styles.navConversationSessionAvatar}>
                            {session.avatarUrl ? (
                              <img alt={session.avatarName} src={session.avatarUrl} />
                            ) : (
                              session.avatarName.slice(0, 1)
                            )}
                          </span>
                          <button
                            type="button"
                            className={styles.navConversationSessionMain}
                            title={session.title}
                            onClick={() => handleSelectConversationSession(session.id)}
                          >
                            <span className={styles.navConversationSessionTitle}>
                              {displayTitle}
                            </span>
                          </button>
                          <div className={styles.navConversationSessionTrailing}>
                            <span className={styles.navConversationSessionTime}>
                              {formatConversationRecordTime(session.updatedAt)}
                            </span>
                            <Dropdown
                              trigger={["click"]}
                              menu={{
                                items: [
                                  {
                                    key: "rename",
                                    label: "重命名",
                                    onClick: () =>
                                      handleRenameConversationSession(session.id, session.title),
                                  },
                                  {
                                    key: "delete",
                                    label: "删除",
                                    danger: true,
                                    onClick: () => handleRemoveConversationSession(session.id),
                                  },
                                ],
                              }}
                            >
                              <button
                                type="button"
                                className={styles.navConversationSessionAction}
                                aria-label="对话操作"
                                onClick={event => event.stopPropagation()}
                              >
                                <MoreOutlined />
                              </button>
                            </Dropdown>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.navConversationEmpty}>暂无对话记录</div>
                  )}
                </div>
              </section>
            ) : null}
          </nav>

          <div
            className={classNames(styles.navFooter, {
              [styles.navFooterCollapsed]: isSidebarCollapsed,
            })}
          >
            <Dropdown
              menu={{ items: accountMenuItems }}
              placement={
                isMobileWorkbench ? "bottomRight" : isSidebarCollapsed ? "topRight" : "topLeft"
              }
              trigger={["click"]}
              open={isAccountMenuOpen}
              onOpenChange={setIsAccountMenuOpen}
              dropdownRender={menu => (
                <AccountDropdownPanel
                  accountName={featureAccountName}
                  menu={menu}
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
                  [styles.navAccountButtonCollapsed]: isSidebarCollapsed || isMobileWorkbench,
                })}
                aria-label="打开账户菜单"
              >
                <Avatar className={styles.accountAvatar} size={30}>
                  {featureAccountName.slice(0, 1)}
                </Avatar>
                {isSidebarCollapsed || isMobileWorkbench ? null : (
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
