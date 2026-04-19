import { useCallback, useMemo, useState } from "react";

import { message } from "antd";

import { getAvatarUrl } from "@/pages/utils";
import {
  loadEnterpriseAgentOrders,
  type EnterpriseAgentOrderRecord,
} from "@/feature/fde/enterpriseAgentOrders";
import type { EmployeeItem } from "../../types";
import type { AgentStoreViewProps } from "./types";
import { AgentStoreTeamDetail, EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";
import { getExpertAssetMeta, getExpertAssetRangeLabel } from "./expertAssetMeta";
import {
  doesExpertRequireDeviceBinding,
  getPendingPermissionWorkspaceIdsForExpert,
  getAssignedWorkspaceIdsForExpert,
  isPermissionAssignmentConfigured,
} from "./utils";

import adminStyles from "../FrontisAdminViews.module.less";
import styles from "./AgentStoreView.module.less";

type AgentFilterKey = "all" | "purchased" | "developed" | "pending";

interface ManagementStatus {
  label: string;
  tone: "success" | "warning";
}

interface SingleCardItem {
  acquireLabel: string;
  avatarUrl?: string;
  description: string;
  employee: EmployeeItem;
  entryType: "employee" | "order";
  id: string;
  name: string;
  ownerLabel: string;
  ownerName: string;
  orderNo?: string;
  rangeLabel: string;
  sourceLabel: string;
  sourceType: "purchased" | "developed";
  status: ManagementStatus;
  statusHint?: string;
  versionLabel: string;
}

interface OrderedAssetCatalogItem {
  avatarSeed: string;
  description: string;
  name: string;
  versionLabel: string;
}

const FILTER_OPTIONS: Array<{ key: AgentFilterKey; label: string }> = [
  { key: "all", label: "全部资产" },
  { key: "purchased", label: "企业采购" },
  { key: "developed", label: "企业开发" },
  { key: "pending", label: "待配置" },
];

const hasPendingUpgrade = (employeeId: string): boolean => {
  const versionInfo = EXPERT_VERSION_INFO[employeeId];
  return Boolean(versionInfo?.newVersion && versionInfo.newVersion !== versionInfo.version);
};

const ORDERED_ASSET_CATALOG: Record<number, OrderedAssetCatalogItem> = {
  1: {
    avatarSeed: "employee-pm",
    description: "根据客户画像与历史沟通记录，实时生成个性化销售话术与应对策略，提升转化率与客户满意度。",
    name: "销售话术助手",
    versionLabel: "v1.2.0",
  },
  3: {
    avatarSeed: "employee-architect",
    description: "智能追踪项目里程碑与任务进度，自动生成周报与风险预警，帮助 PM 高效管理交付节奏。",
    name: "项目交付助手",
    versionLabel: "v2.0.0",
  },
  4: {
    avatarSeed: "employee-growth",
    description: "专为广州联创科技定制的 CRM 系统集成 Agent，支持客户数据自动同步和销售流程自动化。",
    name: "广州联创CRM集成",
    versionLabel: "v1.0.0",
  },
  5: {
    avatarSeed: "employee-qa",
    description: "智能识别合同中的风险条款，自动提取关键日期、金额与义务，生成审核摘要。",
    name: "合同审查助手",
    versionLabel: "v1.1.0",
  },
  12: {
    avatarSeed: "employee-data",
    description: "自动处理权限申请，智能校验合规性并推送审批流。",
    name: "权限审批助手",
    versionLabel: "v1.2.0",
  },
};

const getOrderedAssetStatus = (order: EnterpriseAgentOrderRecord): ManagementStatus => {
  if (order.status === "active") {
    return {
      label: order.orderType === "trial" ? "试用中" : "已开通",
      tone: "success",
    };
  }

  if (order.status === "awaitingReceipt") {
    return {
      label: "待上传凭证",
      tone: "warning",
    };
  }

  if (order.status === "reviewing") {
    return {
      label: "待审核",
      tone: "warning",
    };
  }

  if (order.status === "awaitingActivation") {
    return {
      label: "待开通",
      tone: "warning",
    };
  }

  return {
    label: "已驳回",
    tone: "warning",
  };
};

const getOrderedAssetStatusHint = (order: EnterpriseAgentOrderRecord): string => {
  if (order.status === "awaitingReceipt") {
    return "订单已创建，待上传付款凭证并提交审核";
  }

  if (order.status === "reviewing") {
    return "凭证已提交，等待平台运营审核";
  }

  if (order.status === "awaitingActivation") {
    return "审核通过，等待平台开通交付";
  }

  if (order.status === "active") {
    return order.orderType === "trial" ? "试用已开通，可继续观察效果" : "已完成开通，待进入企业配置";
  }

  return order.reviewNote ?? "订单已驳回，待重新下单";
};

const getSingleStatus = (
  employee: EmployeeItem,
  deploymentByEmployeeId: AgentStoreViewProps["deploymentByEmployeeId"],
): ManagementStatus => {
  const assetMeta = getExpertAssetMeta(employee);

  if (doesExpertRequireDeviceBinding(employee)) {
    const assignedWorkspaceIds = getAssignedWorkspaceIdsForExpert(
      employee,
      deploymentByEmployeeId[employee.id],
    );

    if (!assignedWorkspaceIds.length) {
      return {
        label: "待绑定设备",
        tone: "warning",
      };
    }

    if (getPendingPermissionWorkspaceIdsForExpert(employee, deploymentByEmployeeId[employee.id]).length) {
      return {
        label: "待分配权限",
        tone: "warning",
      };
    }
  } else if (!isPermissionAssignmentConfigured(employee)) {
    return {
      label: "待分配权限",
      tone: "warning",
    };
  }

  if (assetMeta.source === "purchased" && hasPendingUpgrade(employee.id)) {
    return {
      label: "待升级",
      tone: "warning",
    };
  }

  return {
    label: "已配置",
    tone: "success",
  };
};

/**
 * 企业管理员侧 AI 专家主视图。
 */
export const AgentStoreView = ({
  deploymentByEmployeeId,
  deviceOwners,
  employees,
  organizationDepartments,
  onAttachEmployeeToDevice,
  onDetachEmployeeFromDevice,
  onNavigateToTab,
  onUpdateEmployeeDeviceAccess,
  onUpdateEmployeeModel,
  users,
  workspaces,
}: AgentStoreViewProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<AgentFilterKey>("all");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const manageableExperts = useMemo(
    () => employees.filter(employee => !doesExpertRequireDeviceBinding(employee)),
    [employees],
  );
  const orderedExpertCards = useMemo<SingleCardItem[]>(() => {
    const enterpriseOrders = loadEnterpriseAgentOrders();

    return enterpriseOrders
      .map(order => {
        const catalogItem = ORDERED_ASSET_CATALOG[order.agentId];

        if (!catalogItem) {
          return null;
        }

        return {
          acquireLabel: order.orderType === "trial" ? "企业试用订单" : "企业采购订单",
          avatarUrl: getAvatarUrl(catalogItem.avatarSeed),
          description: catalogItem.description,
          employee: {
            accessScopeSubjects: [],
            agentId: `enterprise-order-${order.agentId}`,
            avatarUrl: getAvatarUrl(catalogItem.avatarSeed),
            boundMembers: [],
            connectionMode: "cloud",
            id: `enterprise-order-${order.id}`,
            lastAction: order.createdAt,
            model: "Claude Sonnet 4.6",
            name: catalogItem.name,
            portalRoles: ["admin"],
            role: "AI专家",
            runtimeAgentId: `runtime-${order.id}`,
            source: "coworker",
            status: "online",
            summary: catalogItem.description,
            systemPrompt: "",
            visibility: "bound",
            welcomeMessage: "",
            workspaceId: "workspace-cloud",
          },
          entryType: "order",
          id: `order-${order.id}`,
          name: catalogItem.name,
          orderNo: order.orderNo,
          ownerLabel: "采购人",
          ownerName: order.contactName,
          rangeLabel: order.status === "active" ? "企业内待配置" : "交付中",
          sourceLabel: "企业采购",
          sourceType: "purchased",
          status: getOrderedAssetStatus(order),
          statusHint: getOrderedAssetStatusHint(order),
          versionLabel: catalogItem.versionLabel,
        } satisfies SingleCardItem;
      })
      .filter((item): item is SingleCardItem => item !== null);
  }, []);

  const singleCards = useMemo<SingleCardItem[]>(
    () =>
      manageableExperts.map(employee => {
        const assetMeta = getExpertAssetMeta(employee);
        const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };

        return {
          acquireLabel: assetMeta.acquireLabel,
          avatarUrl: employee.avatarUrl,
          description: employee.summary,
          employee,
          entryType: "employee",
          id: employee.id,
          name: employee.name,
          ownerLabel: assetMeta.ownerLabel,
          ownerName: assetMeta.ownerName,
          rangeLabel: getExpertAssetRangeLabel(employee),
          sourceLabel: assetMeta.sourceLabel,
          sourceType: assetMeta.source,
          status: getSingleStatus(employee, deploymentByEmployeeId),
          statusHint: "进入配置",
          versionLabel: versionInfo.version,
        };
      }),
    [deploymentByEmployeeId, manageableExperts],
  );
  const mergedCards = useMemo<SingleCardItem[]>(
    () => [...orderedExpertCards, ...singleCards],
    [orderedExpertCards, singleCards],
  );

  const filteredCards = useMemo<SingleCardItem[]>(() => {
    if (activeFilter === "all") {
      return mergedCards;
    }

    if (activeFilter === "purchased") {
      return mergedCards.filter(card => card.sourceType === "purchased");
    }

    if (activeFilter === "developed") {
      return mergedCards.filter(card => card.sourceType === "developed");
    }

    if (activeFilter === "pending") {
      return mergedCards.filter(card => card.status.tone === "warning");
    }

    return mergedCards;
  }, [activeFilter, mergedCards]);

  const selectedExpert = useMemo(
    () => manageableExperts.find(employee => employee.id === selectedExpertId) ?? null,
    [manageableExperts, selectedExpertId],
  );

  const handleSelectEntry = useCallback((entryId: string): void => {
    const orderedCard = orderedExpertCards.find(card => card.id === entryId);

    if (orderedCard) {
      message.info(orderedCard.statusHint ?? "当前订单完成后会进入企业配置。");
      return;
    }

    setSelectedExpertId(entryId);
  }, [orderedExpertCards]);

  const handleBack = useCallback((): void => {
    setSelectedExpertId(null);
  }, []);

  const handleChangeFilter = useCallback((filterKey: AgentFilterKey): void => {
    setActiveFilter(filterKey);
  }, []);

  if (selectedExpert) {
    return (
      <AgentStoreTeamDetail
        deploymentByEmployeeId={deploymentByEmployeeId}
        deviceOwners={deviceOwners}
        detailTitle={selectedExpert.name}
        employees={[selectedExpert]}
        organizationDepartments={organizationDepartments}
        onBack={handleBack}
        onAttachEmployeeToDevice={onAttachEmployeeToDevice}
        onDetachEmployeeFromDevice={onDetachEmployeeFromDevice}
        onNavigateToTab={onNavigateToTab}
        onUpdateDeviceAccess={onUpdateEmployeeDeviceAccess}
        onUpdateModel={onUpdateEmployeeModel}
        users={users}
        workspaces={workspaces}
      />
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家管理</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleTabs}>
          {FILTER_OPTIONS.map(filter => (
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
          {filteredCards.map(card => {
            return (
              <article key={card.id} className={styles.assetCard}>
                <button
                  type="button"
                  className={styles.assetPreviewButton}
                  onClick={() => handleSelectEntry(card.id)}
                >
                  <div
                    className={
                      card.sourceType === "purchased"
                        ? `${styles.assetVisualPanel} ${styles.assetVisualPanelPurchased}`
                        : `${styles.assetVisualPanel} ${styles.assetVisualPanelDeveloped}`
                    }
                  >
                    <span className={styles.assetVisibilityBadge}>{card.sourceLabel}</span>
                    <div className={styles.assetVisualGlow} />
                    <img
                      alt={card.name}
                      className={styles.assetPortrait}
                      src={card.avatarUrl ?? card.employee.avatarUrl}
                    />
                  </div>

                  <div className={styles.assetBody}>
                    <div className={styles.assetTitleRow}>
                      <h3 className={styles.assetTitle}>{card.name}</h3>
                    <div className={styles.assetVersionMeta}>
                      <span
                        className={
                            card.status.tone === "success"
                              ? styles.assetPublishBadge
                              : styles.assetPendingBadge
                          }
                        >
                          {card.status.label}
                        </span>
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
                    <div className={styles.assetDeliveryInfo}>
                      <strong>{card.orderNo ?? card.acquireLabel}</strong>
                      <span>{card.statusHint ?? "进入配置"}</span>
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
        {!filteredCards.length ? (
          <div className={styles.assetEmptyState}>当前筛选条件下暂无 AI 专家。</div>
        ) : null}
      </section>
    </div>
  );
};
