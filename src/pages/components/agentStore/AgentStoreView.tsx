import { useCallback, useMemo, useState } from "react";

import { getAvatarUrl } from "@/pages/utils";
import type { EmployeeItem } from "../../types";
import { AgentStoreTeamDetail, EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";
import { getExpertOwnershipMeta, getExpertRangeLabel } from "./expertOwnershipMeta";
import type { AgentStoreViewProps } from "./types";
import { isPermissionAssignmentConfigured } from "./utils";

import adminStyles from "../FrontisAdminViews.module.less";
import styles from "./AgentStoreView.module.less";

type AgentFilterKey = "all" | "public" | "shared" | "personal" | "owned";

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
  name: string;
  ownerLabel: string;
  ownerName: string;
  rangeLabel: string;
  status: ManagementStatus | null;
  versionLabel: string;
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
];

const getSingleStatus = (employee: EmployeeItem): ManagementStatus | null => {
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

/**
 * 租户管理员侧 AI 专家主视图。
 */
export const AgentStoreView = ({
  currentUserName,
  employees,
  organizationDepartments,
  onUpdateEmployeeAccess,
  onUpdateEmployeeLaborCosts,
  onUpdateEmployeeModel,
  tenantSnapshot,
  users,
}: AgentStoreViewProps): JSX.Element => {
  const isPersonalEdition = tenantSnapshot.edition === "personal";
  const isPrivateCloud = tenantSnapshot.deploymentMode === "privateCloud";
  const filterOptions = isPersonalEdition ? PERSONAL_FILTER_OPTIONS : TEAM_FILTER_OPTIONS;
  const [activeFilter, setActiveFilter] = useState<AgentFilterKey>("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const selfDevelopedExperts = useMemo(
    () =>
      isPersonalEdition
        ? employees.filter(employee => employee.developerName === currentUserName)
        : employees,
    [currentUserName, employees, isPersonalEdition],
  );

  const developedCards = useMemo<SingleCardItem[]>(
    () =>
      selfDevelopedExperts.map(employee => {
        const ownershipMeta = getExpertOwnershipMeta(employee);
        const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? {
          currentVersion: "v1.0",
          records: [],
        };

        return {
          acquireLabel: isPersonalEdition ? "自己开发" : ownershipMeta.acquireLabel,
          avatarUrl: employee.avatarUrl ?? getAvatarUrl(employee.id),
          description: employee.summary,
          employee,
          filterKey: isPersonalEdition ? "owned" : getTeamFilterKey(employee),
          id: `developed-${employee.id}`,
          name: employee.name,
          ownerLabel: ownershipMeta.ownerLabel,
          ownerName: ownershipMeta.ownerName,
          rangeLabel: isPersonalEdition ? "个人版" : getExpertRangeLabel(employee),
          status: isPersonalEdition
            ? {
                label: "个人可用",
                tone: "success",
              }
            : getSingleStatus(employee),
          versionLabel: versionInfo.currentVersion,
        };
      }),
    [isPersonalEdition, selfDevelopedExperts],
  );
  const cards = developedCards;
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

  if (selectedCard?.employee) {
    return (
      <AgentStoreTeamDetail
        platformModelOnly={isPersonalEdition}
        allowPermissionManagement={!isPersonalEdition}
        allowLaborCostConfiguration={isPrivateCloud}
        detailTitle={selectedCard.name}
        employees={[selectedCard.employee]}
        organizationDepartments={organizationDepartments}
        onBack={handleBack}
        onUpdateAccess={onUpdateEmployeeAccess}
        onUpdateLaborCosts={onUpdateEmployeeLaborCosts}
        onUpdateModel={onUpdateEmployeeModel}
        users={users}
      />
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家管理</h1>
          <p className={adminStyles.consoleSubtitle}>
            {isPersonalEdition
              ? "个人版仅展示你自己开发的 AI 专家。"
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

        <div className={styles.expertCardGrid}>
          {filteredCards.map(card => (
            <article key={card.id} className={styles.expertCard}>
              <button
                type="button"
                className={styles.expertPreviewButton}
                onClick={() => handleSelectEntry(card.id)}
              >
                <div
                  className={`${styles.expertVisualPanel} ${styles.expertVisualPanelDeveloped}`}
                >
                  <span className={styles.expertVisibilityBadge}>{card.acquireLabel}</span>
                  <div className={styles.expertVisualGlow} />
                  <img alt={card.name} className={styles.expertPortrait} src={card.avatarUrl} />
                </div>

                <div className={styles.expertBody}>
                  <div className={styles.expertTitleRow}>
                    <h3 className={styles.expertTitle}>{card.name}</h3>
                    <div className={styles.expertVersionMeta}>
                      {card.status ? (
                        <span
                          className={
                            card.status.tone === "success"
                              ? styles.expertPublishBadge
                              : styles.expertPendingBadge
                          }
                        >
                          {card.status.label}
                        </span>
                      ) : null}
                      <span className={styles.expertVersionText}>{card.versionLabel}</span>
                    </div>
                  </div>

                  <div className={styles.expertBadgeRow}>
                    <span className={styles.expertOwnerBadge}>
                      {card.ownerLabel}：{card.ownerName}
                    </span>
                    <span className={styles.expertRangeBadge}>{card.rangeLabel}</span>
                  </div>

                  <p className={styles.expertDescription}>{card.description}</p>
                </div>
              </button>
            </article>
          ))}
        </div>
        {!filteredCards.length ? (
          <div className={styles.expertEmptyState}>
            {isPersonalEdition
              ? "当前还没有自己开发的 AI 专家。"
              : "当前筛选条件下暂无 AI 专家。"}
          </div>
        ) : null}
      </section>
    </div>
  );
};
