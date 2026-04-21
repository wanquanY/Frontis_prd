import { useCallback, useMemo, useState } from "react";

import { getAvatarUrl } from "@/pages/utils";
import type { EmployeeItem } from "../../types";
import type { AgentStoreViewProps } from "./types";
import { AgentStoreTeamDetail, EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";
import { getExpertAssetMeta, getExpertAssetRangeLabel } from "./expertAssetMeta";
import {
  doesExpertRequireDeviceBinding,
  isPermissionAssignmentConfigured,
} from "./utils";

import adminStyles from "../FrontisAdminViews.module.less";
import styles from "./AgentStoreView.module.less";

type AgentFilterKey = "all" | "public" | "shared" | "personal";

interface ManagementStatus {
  label: string;
  tone: "success" | "warning";
}

interface SingleCardItem {
  acquireLabel: string;
  avatarUrl?: string;
  description: string;
  employee: EmployeeItem;
  id: string;
  name: string;
  ownerLabel: string;
  ownerName: string;
  rangeLabel: string;
  status: ManagementStatus | null;
  versionLabel: string;
}

const FILTER_OPTIONS: Array<{ key: AgentFilterKey; label: string }> = [
  { key: "all", label: "全部AI专家" },
  { key: "public", label: "企业公开" },
  { key: "shared", label: "团队共享" },
  { key: "personal", label: "个人发布" },
];

const getSingleStatus = (
  employee: EmployeeItem,
): ManagementStatus | null => {
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

const getFilterKey = (employee: EmployeeItem): AgentFilterKey => {
  if (employee.visibility === "all") {
    return "public";
  }

  if (employee.accessScopeSubjects.length > 0) {
    return "shared";
  }

  return "personal";
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

  const singleCards = useMemo<SingleCardItem[]>(
    () =>
      manageableExperts.map(employee => {
        const assetMeta = getExpertAssetMeta(employee);
        const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? {
          currentVersion: "v1.0",
          records: [],
        };

        return {
          acquireLabel: assetMeta.acquireLabel,
          avatarUrl: employee.avatarUrl ?? getAvatarUrl(employee.id),
          description: employee.summary,
          employee,
          id: employee.id,
          name: employee.name,
          ownerLabel: assetMeta.ownerLabel,
          ownerName: assetMeta.ownerName,
          rangeLabel: getExpertAssetRangeLabel(employee),
          status: getSingleStatus(employee),
          versionLabel: versionInfo.currentVersion,
        };
      }),
    [manageableExperts],
  );

  const filteredCards = useMemo<SingleCardItem[]>(
    () =>
      activeFilter === "all"
        ? singleCards
        : singleCards.filter(card => getFilterKey(card.employee) === activeFilter),
    [activeFilter, singleCards],
  );

  const selectedExpert = useMemo(
    () => manageableExperts.find(employee => employee.id === selectedExpertId) ?? null,
    [manageableExperts, selectedExpertId],
  );

  const handleSelectEntry = useCallback((entryId: string): void => {
    setSelectedExpertId(entryId);
  }, []);

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
          <p className={adminStyles.consoleSubtitle}>
            当前仅管理企业内开发并发布的 AI 专家，平台发布专家暂不在企业后台治理。
          </p>
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
          {filteredCards.map(card => (
            <article key={card.id} className={styles.assetCard}>
              <button
                type="button"
                className={styles.assetPreviewButton}
                onClick={() => handleSelectEntry(card.id)}
              >
                <div
                  className={
                    card.employee.visibility === "all"
                      ? `${styles.assetVisualPanel} ${styles.assetVisualPanelPurchased}`
                      : `${styles.assetVisualPanel} ${styles.assetVisualPanelDeveloped}`
                  }
                >
                  <span className={styles.assetVisibilityBadge}>{card.acquireLabel}</span>
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
          <div className={styles.assetEmptyState}>当前筛选条件下暂无 AI 专家。</div>
        ) : null}
      </section>
    </div>
  );
};
