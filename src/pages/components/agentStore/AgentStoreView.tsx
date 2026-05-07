import { useCallback, useMemo, useState } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";

import type { EnterpriseAgentOrderRecord } from "@/feature/fde/enterpriseAgentOrders";
import { loadEnterpriseAgentOrders } from "@/feature/fde/enterpriseAgentOrders";
import { loadStoredOperationsProducts } from "@/feature/operations/commerceStorage";
import type { OperationsProduct } from "@/feature/operations/types";
import { getAvatarUrl } from "@/pages/utils";
import type { EmployeeItem } from "../../types";
import { AgentStoreTeamDetail, EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";
import { getExpertAssetMeta, getExpertAssetRangeLabel } from "./expertAssetMeta";
import type { AgentStoreViewProps } from "./types";
import { doesExpertRequireDeviceBinding, isPermissionAssignmentConfigured } from "./utils";

import adminStyles from "../FrontisAdminViews.module.less";
import styles from "./AgentStoreView.module.less";

type AgentFilterKey = "all" | "public" | "shared" | "personal" | "owned" | "purchased";
type ManagedAssetKind = "developed" | "purchased";

interface ManagementStatus {
  label: string;
  tone: "success" | "warning";
}

interface SingleCardItem {
  acquireLabel: string;
  avatarUrl?: string;
  description: string;
  employee?: EmployeeItem;
  filterKey: AgentFilterKey;
  id: string;
  kind: ManagedAssetKind;
  name: string;
  order?: EnterpriseAgentOrderRecord;
  ownerLabel: string;
  ownerName: string;
  rangeLabel: string;
  status: ManagementStatus | null;
  versionLabel: string;
  visualTone: "developed" | "purchased";
}

const TEAM_FILTER_OPTIONS: Array<{ key: AgentFilterKey; label: string }> = [
  { key: "all", label: "全部AI专家" },
  { key: "public", label: "企业公开" },
  { key: "shared", label: "团队共享" },
  { key: "personal", label: "个人发布" },
];

const PERSONAL_FILTER_OPTIONS: Array<{ key: AgentFilterKey; label: string }> = [
  { key: "all", label: "全部AI专家" },
  { key: "owned", label: "自己开发" },
  { key: "purchased", label: "已添加" },
];

const getSingleStatus = (employee: EmployeeItem): ManagementStatus | null => {
  if (doesExpertRequireDeviceBinding(employee)) {
    return {
      label: "待配置",
      tone: "warning",
    };
  }

  if (!isPermissionAssignmentConfigured(employee)) {
    return {
      label: "待分配权限",
      tone: "warning",
    };
  }

  return null;
};

const getTeamFilterKey = (employee: EmployeeItem): AgentFilterKey => {
  if (employee.visibility === "all") {
    return "public";
  }

  if (employee.accessScopeSubjects.length > 0) {
    return "shared";
  }

  return "personal";
};

const getTimelineValue = (order: EnterpriseAgentOrderRecord): string =>
  order.paidAt ?? order.createdAt;

const getStatusClassName = (tone: ManagementStatus["tone"]): string =>
  tone === "success" ? adminStyles.consoleStatusTagSuccess : adminStyles.consoleStatusTagWarning;

/**
 * 租户管理员侧 AI 专家主视图。
 */
export const AgentStoreView = ({
  currentUserName,
  deploymentByEmployeeId,
  deviceOwners,
  employees,
  organizationDepartments,
  onAttachEmployeeToDevice,
  onDetachEmployeeFromDevice,
  onNavigateToTab,
  onUpdateEmployeeDeviceAccess,
  onUpdateEmployeeLaborCosts,
  onUpdateEmployeeModel,
  tenantSnapshot,
  users,
  workspaces,
}: AgentStoreViewProps): JSX.Element => {
  const isPersonalEdition = tenantSnapshot.edition === "personal";
  const isPrivateCloud = tenantSnapshot.deploymentMode === "privateCloud";
  const filterOptions = isPersonalEdition ? PERSONAL_FILTER_OPTIONS : TEAM_FILTER_OPTIONS;
  const [activeFilter, setActiveFilter] = useState<AgentFilterKey>("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const manageableExperts = useMemo(
    () => employees.filter(employee => !doesExpertRequireDeviceBinding(employee)),
    [employees],
  );
  const selfDevelopedExperts = useMemo(
    () =>
      isPersonalEdition
        ? manageableExperts.filter(employee => employee.developerName === currentUserName)
        : manageableExperts,
    [currentUserName, isPersonalEdition, manageableExperts],
  );
  const operationsProductMap = useMemo(() => {
    const products = loadStoredOperationsProducts();
    return new Map<string, OperationsProduct>(products.map(product => [product.id, product]));
  }, []);
  const purchasedOrderMap = useMemo(() => {
    if (!isPersonalEdition) {
      return new Map<string, EnterpriseAgentOrderRecord>();
    }

    return loadEnterpriseAgentOrders()
      .filter(
        order =>
          order.tenantId === tenantSnapshot.tenantId &&
          order.orderType === "purchase" &&
          order.status === "active",
      )
      .reduce<Map<string, EnterpriseAgentOrderRecord>>((result, order) => {
        const currentOrder = result.get(order.productId);

        if (!currentOrder || getTimelineValue(order) > getTimelineValue(currentOrder)) {
          result.set(order.productId, order);
        }

        return result;
      }, new Map<string, EnterpriseAgentOrderRecord>());
  }, [isPersonalEdition, tenantSnapshot.tenantId]);

  const developedCards = useMemo<SingleCardItem[]>(
    () =>
      selfDevelopedExperts.map(employee => {
        const assetMeta = getExpertAssetMeta(employee);
        const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? {
          currentVersion: "v1.0",
          records: [],
        };

        return {
          acquireLabel: isPersonalEdition ? "自己开发" : assetMeta.acquireLabel,
          avatarUrl: employee.avatarUrl ?? getAvatarUrl(employee.id),
          description: employee.summary,
          employee,
          filterKey: isPersonalEdition ? "owned" : getTeamFilterKey(employee),
          id: `developed-${employee.id}`,
          kind: "developed",
          name: employee.name,
          ownerLabel: assetMeta.ownerLabel,
          ownerName: assetMeta.ownerName,
          rangeLabel: isPersonalEdition ? "个人版" : getExpertAssetRangeLabel(employee),
          status: isPersonalEdition
            ? {
                label: "个人可用",
                tone: "success",
              }
            : getSingleStatus(employee),
          versionLabel: versionInfo.currentVersion,
          visualTone: "developed",
        };
      }),
    [isPersonalEdition, selfDevelopedExperts],
  );
  const purchasedCards = useMemo<SingleCardItem[]>(
    () =>
      Array.from(purchasedOrderMap.values()).map(order => {
        const product = operationsProductMap.get(order.productId);

        return {
          acquireLabel: order.orderType === "trial" ? "试用中" : "已添加",
          avatarUrl: getAvatarUrl(`purchased-${order.productId}`),
          description: product?.description ?? `${order.productName} 已开通，可直接使用。`,
          filterKey: "purchased",
          id: `purchased-${order.id}`,
          kind: "purchased",
          name: order.agentName,
          order,
          ownerLabel: "来源",
          ownerName: "FrontisAI发布",
          rangeLabel: "已开通",
          status:
            order.orderType === "trial"
              ? {
                  label: "试用中",
                  tone: "warning",
                }
              : {
                  label: "已开通",
                  tone: "success",
                },
          versionLabel: order.subscriptionPlanLabel ?? order.priceLabel,
          visualTone: "purchased",
        };
      }),
    [operationsProductMap, purchasedOrderMap],
  );
  const cards = useMemo<SingleCardItem[]>(
    () => (isPersonalEdition ? [...developedCards, ...purchasedCards] : developedCards),
    [developedCards, isPersonalEdition, purchasedCards],
  );
  const filteredCards = useMemo<SingleCardItem[]>(
    () => (activeFilter === "all" ? cards : cards.filter(card => card.filterKey === activeFilter)),
    [activeFilter, cards],
  );
  const selectedCard = useMemo(
    () => cards.find(card => card.id === selectedEntryId) ?? null,
    [cards, selectedEntryId],
  );

  const handleSelectEntry = useCallback((entryId: string): void => {
    setSelectedEntryId(entryId);
  }, []);

  const handleBack = useCallback((): void => {
    setSelectedEntryId(null);
  }, []);

  const handleChangeFilter = useCallback((filterKey: AgentFilterKey): void => {
    setActiveFilter(filterKey);
  }, []);

  if (selectedCard?.kind === "developed" && selectedCard.employee) {
    return (
      <AgentStoreTeamDetail
        platformModelOnly={isPersonalEdition}
        allowPermissionManagement={!isPersonalEdition}
        allowLaborCostConfiguration={isPrivateCloud}
        deploymentByEmployeeId={deploymentByEmployeeId}
        deviceOwners={deviceOwners}
        detailTitle={selectedCard.name}
        employees={[selectedCard.employee]}
        organizationDepartments={organizationDepartments}
        onBack={handleBack}
        onAttachEmployeeToDevice={onAttachEmployeeToDevice}
        onDetachEmployeeFromDevice={onDetachEmployeeFromDevice}
        onNavigateToTab={onNavigateToTab}
        onUpdateDeviceAccess={onUpdateEmployeeDeviceAccess}
        onUpdateLaborCosts={onUpdateEmployeeLaborCosts}
        onUpdateModel={onUpdateEmployeeModel}
        users={users}
        workspaces={workspaces}
      />
    );
  }

  if (selectedCard?.kind === "purchased" && selectedCard.order) {
    return <PurchasedExpertDetail card={selectedCard} onBack={handleBack} />;
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家管理</h1>
          <p className={adminStyles.consoleSubtitle}>
            {isPersonalEdition
              ? "个人版仅展示你自己开发和已添加的 AI 专家。"
              : "当前仅管理租户内开发并发布的 AI 专家。"}
          </p>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleTabs}>
          {filterOptions.map(filter => (
            <button
              key={filter.key}
              type="button"
              className={
                activeFilter === filter.key
                  ? `${adminStyles.consoleTabButton} ${adminStyles.consoleTabButtonActive}`
                  : adminStyles.consoleTabButton
              }
              onClick={() => handleChangeFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className={styles.assetCardGrid}>
          {filteredCards.map(card => (
            <article key={card.id} className={styles.assetCard}>
              <button
                type="button"
                className={styles.assetPreviewButton}
                onClick={() => handleSelectEntry(card.id)}
              >
                <div
                  className={
                    card.visualTone === "purchased"
                      ? `${styles.assetVisualPanel} ${styles.assetVisualPanelPurchased}`
                      : `${styles.assetVisualPanel} ${styles.assetVisualPanelDeveloped}`
                  }
                >
                  <span className={styles.assetVisibilityBadge}>{card.acquireLabel}</span>
                  <div className={styles.assetVisualGlow} />
                  <img alt={card.name} className={styles.assetPortrait} src={card.avatarUrl} />
                </div>

                <div className={styles.assetBody}>
                  <div className={styles.assetTitleRow}>
                    <h3 className={styles.assetTitle}>{card.name}</h3>
                    <div className={styles.assetVersionMeta}>
                      {card.status ? (
                        <span
                          className={
                            card.status.tone === "success"
                              ? styles.assetPublishBadge
                              : styles.assetPendingBadge
                          }
                        >
                          {card.status.label}
                        </span>
                      ) : null}
                      <span className={styles.assetVersionText}>{card.versionLabel}</span>
                    </div>
                  </div>

                  <div className={styles.assetBadgeRow}>
                    <span className={styles.assetOwnerBadge}>
                      {card.ownerLabel}：{card.ownerName}
                    </span>
                    <span className={styles.assetRangeBadge}>{card.rangeLabel}</span>
                  </div>

                  <p className={styles.assetDescription}>{card.description}</p>
                </div>
              </button>
            </article>
          ))}
        </div>
        {!filteredCards.length ? (
          <div className={styles.assetEmptyState}>
            {isPersonalEdition
              ? "当前还没有自己开发或已添加的 AI 专家。"
              : "当前筛选条件下暂无 AI 专家。"}
          </div>
        ) : null}
      </section>
    </div>
  );
};

interface PurchasedExpertDetailProps {
  card: SingleCardItem;
  onBack: () => void;
}

const PurchasedExpertDetail = ({ card, onBack }: PurchasedExpertDetailProps): JSX.Element => {
  const order = card.order;

  if (!order) {
    return (
      <div className={adminStyles.consolePage}>
        <header className={adminStyles.consolePaneHeader}>
          <div className={adminStyles.consolePaneHeaderMain}>
            <div className={adminStyles.consoleActions}>
              <Button type="link" icon={<ArrowLeftOutlined />} size="small" onClick={onBack}>
                返回上一页
              </Button>
              <h2 className={adminStyles.consolePaneTitle}>AI专家详情</h2>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consolePaneHeader}>
        <div className={adminStyles.consolePaneHeaderMain}>
          <div className={adminStyles.consoleActions}>
            <Button type="link" icon={<ArrowLeftOutlined />} size="small" onClick={onBack}>
              返回上一页
            </Button>
            <h2 className={adminStyles.consolePaneTitle}>{card.name}</h2>
          </div>
          <p className={adminStyles.consolePaneSubtitle}>{card.description}</p>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSummaryStrip}>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>当前状态</span>
            <span
              className={`${adminStyles.consoleStatusTag} ${getStatusClassName(card.status?.tone ?? "warning")}`}
            >
              {card.status?.label ?? "已开通"}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>获取方式</span>
            <span className={adminStyles.consoleSummaryValue}>
              {order.orderType === "trial" ? "免费试用" : "免费添加"}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>有效期</span>
            <span className={adminStyles.consoleSummaryValue}>
              {order.subscriptionDurationLabel ?? "按订单生效"}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>开通方式</span>
            <span className={adminStyles.consoleSummaryValue}>平台商品</span>
          </div>
        </div>
      </section>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>来源</span>
          <span className={adminStyles.consoleInfoValue}>FrontisAI发布</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>商品名称</span>
          <span className={adminStyles.consoleInfoValue}>{order.productName}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>订单号</span>
          <span className={adminStyles.consoleInfoValue}>{order.orderNo}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>开通人</span>
          <span className={adminStyles.consoleInfoValue}>{order.purchaserName}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>开通时间</span>
          <span className={adminStyles.consoleInfoValue}>{order.startsAt}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>开通时间</span>
          <span className={adminStyles.consoleInfoValue}>{order.paidAt ?? order.createdAt}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>到期时间</span>
          <span className={adminStyles.consoleInfoValue}>{order.expiresAt ?? "长期有效"}</span>
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>开通对象</span>
          <span className={adminStyles.consoleInfoValue}>{order.tenantName}</span>
        </div>
      </section>
    </div>
  );
};
