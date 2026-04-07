import { useCallback, useMemo, useState } from "react";

import { ThunderboltOutlined } from "@ant-design/icons";
import { Avatar } from "antd";

import type { EmployeeItem } from "../../types";
import type { AgentStoreViewProps } from "./types";
import { OWNED_EXPERT_TEAMS, RECOMMENDED_EXPERT_TEAMS } from "./agentStoreData";
import { RecommendedTeamCard } from "./AgentStoreCards";
import { AgentStoreTeamDetail, EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";
import {
  doesExpertRequireDeviceBinding,
  getPendingPermissionWorkspaceIdsForExpert,
  getAssignedWorkspaceIdsForExpert,
  isExpertAccessConfigured,
  isPermissionAssignmentConfigured,
} from "./utils";

import adminStyles from "../FrontisAdminViews.module.less";
import styles from "./AgentStoreView.module.less";

type AgentEntryKind = "single" | "team";
type AgentFilterKey = "all" | AgentEntryKind;
type AgentStoreTabKey = "owned" | "recommended";

interface ManagementStatus {
  label: string;
  tone: "success" | "warning";
}

interface TeamCardItem {
  description: string;
  id: string;
  kind: "team";
  members: EmployeeItem[];
  name: string;
  status: ManagementStatus;
}

interface SingleCardItem {
  description: string;
  employee: EmployeeItem;
  id: string;
  kind: "single";
  name: string;
  status: ManagementStatus;
}

type ManagementCardItem = TeamCardItem | SingleCardItem;

const FILTER_OPTIONS: Array<{ key: AgentFilterKey; label: string }> = [
  { key: "all", label: "全部" },
  { key: "team", label: "专家团" },
  { key: "single", label: "专家" },
];

const getStatusClassName = (tone: "success" | "warning"): string =>
  tone === "success"
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`;

const hasPendingUpgrade = (employeeId: string): boolean => {
  const versionInfo = EXPERT_VERSION_INFO[employeeId];
  return Boolean(versionInfo?.newVersion && versionInfo.newVersion !== versionInfo.version);
};

const getTeamStatus = (
  members: EmployeeItem[],
  deploymentByEmployeeId: AgentStoreViewProps["deploymentByEmployeeId"],
): ManagementStatus => {
  const pendingDeviceBindingCount = members.filter(
    member =>
      doesExpertRequireDeviceBinding(member) &&
      !getAssignedWorkspaceIdsForExpert(member, deploymentByEmployeeId[member.id]).length,
  ).length;
  const pendingPermissionCount = members.filter(
    member =>
      !isExpertAccessConfigured(member, deploymentByEmployeeId[member.id]) &&
      (!doesExpertRequireDeviceBinding(member) ||
        getAssignedWorkspaceIdsForExpert(member, deploymentByEmployeeId[member.id]).length > 0),
  ).length;

  if (pendingDeviceBindingCount > 0 || pendingPermissionCount > 0) {
    let label = `待配置 ${pendingDeviceBindingCount + pendingPermissionCount} 个`;

    if (pendingDeviceBindingCount > 0 && pendingPermissionCount === 0) {
      label =
        pendingDeviceBindingCount === members.length
          ? "待绑定设备"
          : `待绑定设备 ${pendingDeviceBindingCount} 个`;
    }

    if (pendingPermissionCount > 0 && pendingDeviceBindingCount === 0) {
      label =
        pendingPermissionCount === members.length
          ? "待分配权限"
          : `待分配权限 ${pendingPermissionCount} 个`;
    }

    return {
      label,
      tone: "warning",
    };
  }

  const pendingUpgradeCount = members.filter(member => hasPendingUpgrade(member.id)).length;
  if (pendingUpgradeCount > 0) {
    return {
      label: `待升级 ${pendingUpgradeCount} 个`,
      tone: "warning",
    };
  }

  return {
    label: "已配置",
    tone: "success",
  };
};

const getSingleStatus = (
  employee: EmployeeItem,
  deploymentByEmployeeId: AgentStoreViewProps["deploymentByEmployeeId"],
): ManagementStatus => {
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

  if (hasPendingUpgrade(employee.id)) {
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
 * 企业管理员侧 AI 专家团主视图。
 */
export const AgentStoreView = ({
  deploymentByEmployeeId,
  deviceOwners,
  employees,
  memberNames,
  onAttachEmployeeToDevice,
  onDetachEmployeeFromDevice,
  onNavigateToTab,
  onUpdateEmployeeDeviceAccess,
  onUpdateEmployeeModel,
  users,
  workspaces,
}: AgentStoreViewProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<AgentStoreTabKey>("owned");
  const [activeFilter, setActiveFilter] = useState<AgentFilterKey>("all");
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; kind: AgentEntryKind } | null>(null);

  const teamMemberIds = useMemo(
    () => new Set(OWNED_EXPERT_TEAMS.flatMap(team => team.memberIds)),
    [],
  );

  const standaloneExperts = useMemo(
    () => employees.filter(employee => !teamMemberIds.has(employee.id)),
    [employees, teamMemberIds],
  );

  const teamCards = useMemo<TeamCardItem[]>(
    () =>
      OWNED_EXPERT_TEAMS.map(team => {
        const members = employees.filter(employee => team.memberIds.includes(employee.id));
        return {
          description: team.description,
          id: team.id,
          kind: "team",
          members,
          name: team.name,
          status: getTeamStatus(members, deploymentByEmployeeId),
        };
      }),
    [deploymentByEmployeeId, employees],
  );

  const singleCards = useMemo<SingleCardItem[]>(
    () =>
      standaloneExperts.map(employee => ({
        description: employee.summary,
        employee,
        id: employee.id,
        kind: "single",
        name: employee.name,
        status: getSingleStatus(employee, deploymentByEmployeeId),
      })),
    [deploymentByEmployeeId, standaloneExperts],
  );

  const managementCards = useMemo<ManagementCardItem[]>(
    () => [...teamCards, ...singleCards],
    [singleCards, teamCards],
  );

  const filteredCards = useMemo<ManagementCardItem[]>(() => {
    if (activeFilter === "all") {
      return managementCards;
    }

    return managementCards.filter(card => card.kind === activeFilter);
  }, [activeFilter, managementCards]);

  const selectedTeam = useMemo(
    () =>
      selectedEntry?.kind === "team"
        ? OWNED_EXPERT_TEAMS.find(item => item.id === selectedEntry.id) ?? null
        : null,
    [selectedEntry],
  );

  const selectedStandaloneExpert = useMemo(
    () =>
      selectedEntry?.kind === "single"
        ? standaloneExperts.find(employee => employee.id === selectedEntry.id) ?? null
        : null,
    [selectedEntry, standaloneExperts],
  );

  const selectedEmployees = useMemo(() => {
    if (selectedTeam) {
      return employees.filter(item => selectedTeam.memberIds.includes(item.id));
    }

    if (selectedStandaloneExpert) {
      return [selectedStandaloneExpert];
    }

    return [];
  }, [employees, selectedStandaloneExpert, selectedTeam]);

  const handleSelectEntry = useCallback((entryId: string, kind: AgentEntryKind): void => {
    setSelectedEntry({ id: entryId, kind });
  }, []);

  const handleBack = useCallback((): void => {
    setSelectedEntry(null);
  }, []);

  const handleChangeFilter = useCallback((filterKey: AgentFilterKey): void => {
    setActiveFilter(filterKey);
  }, []);

  const handleChangeTab = useCallback((tabKey: AgentStoreTabKey): void => {
    setActiveTab(tabKey);
  }, []);

  if (selectedTeam || selectedStandaloneExpert) {
    return (
      <AgentStoreTeamDetail
        deploymentByEmployeeId={deploymentByEmployeeId}
        deviceOwners={deviceOwners}
        detailTitle={selectedTeam?.name ?? selectedStandaloneExpert?.name ?? ""}
        employees={selectedEmployees}
        memberNames={memberNames}
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
          <h1 className={adminStyles.consoleTitle}>AI专家团</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleTabs}>
          <button
            type="button"
            className={
              activeTab === "owned"
                ? `${adminStyles.consoleTabButton} ${adminStyles.consoleTabButtonActive}`
                : adminStyles.consoleTabButton
            }
            onClick={() => handleChangeTab("owned")}
          >
            我的AI专家团 ({managementCards.length})
          </button>
          <button
            type="button"
            className={
              activeTab === "recommended"
                ? `${adminStyles.consoleTabButton} ${adminStyles.consoleTabButtonActive}`
                : adminStyles.consoleTabButton
            }
            onClick={() => handleChangeTab("recommended")}
          >
            推荐AI专家团 ({RECOMMENDED_EXPERT_TEAMS.length})
          </button>
        </div>

        {activeTab === "owned" ? (
          <>
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

            <div className={styles.expertCardGrid}>
              {filteredCards.map(card => (
                <button
                  key={card.id}
                  type="button"
                  className={styles.expertSelectCard}
                  onClick={() => handleSelectEntry(card.id, card.kind)}
                >
                  <div className={styles.managementCardHeader}>
                    <div className={styles.managementCardTitleWrap}>
                      <h3 className={styles.managementCardTitle}>{card.name}</h3>
                    </div>
                    <span className={getStatusClassName(card.status.tone)}>{card.status.label}</span>
                  </div>
                  <p className={styles.managementCardDescription}>{card.description}</p>
                  <div className={styles.managementCardFooter}>
                    <div className={styles.managementAvatarStack}>
                      {card.kind === "team" ? (
                        <>
                          {card.members.slice(0, 4).map(member => (
                            <Avatar
                              key={member.id}
                              className={styles.managementAvatar}
                              src={member.avatarUrl}
                              size={34}
                            >
                              {member.name.slice(0, 1)}
                            </Avatar>
                          ))}
                          {card.members.length > 4 ? (
                            <span className={styles.managementAvatarMore}>+{card.members.length - 4}</span>
                          ) : null}
                        </>
                      ) : (
                        <Avatar className={styles.managementAvatar} src={card.employee.avatarUrl} size={34}>
                          {card.employee.name.slice(0, 1)}
                        </Avatar>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.cardList}>
            <div className={styles.recBanner}>
              <ThunderboltOutlined className={styles.recBannerIcon} />
              <div>
                <p className={styles.recBannerTitle}>智能推荐</p>
                <p className={styles.recBannerDesc}>
                  根据当前已配置的专家组合与常见企业场景，为你补充推荐可协同工作的 AI
                  专家团。
                </p>
              </div>
            </div>

            {RECOMMENDED_EXPERT_TEAMS.map(team => (
              <RecommendedTeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
