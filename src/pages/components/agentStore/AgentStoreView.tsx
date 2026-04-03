import { useCallback, useEffect, useMemo, useState } from "react";

import { Avatar } from "antd";

import type { EmployeeItem } from "../../types";
import type { AgentStoreViewProps, ExpertDeploymentState } from "./types";
import { OWNED_EXPERT_TEAMS } from "./agentStoreData";
import { AgentStoreTeamDetail, EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";

import adminStyles from "../FrontisAdminViews.module.less";
import styles from "./AgentStoreView.module.less";

type AgentEntryKind = "single" | "team";
type AgentFilterKey = "all" | AgentEntryKind;

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

const INITIAL_PENDING_TEAM_EXPERT_IDS = new Set(["employee-research"]);

const getStatusClassName = (tone: "success" | "warning"): string =>
  tone === "success"
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`;

const buildInitialDeploymentState = (
  employee: EmployeeItem,
  isStandalone: boolean,
): ExpertDeploymentState => {
  if (isStandalone || INITIAL_PENDING_TEAM_EXPERT_IDS.has(employee.id)) {
    return {
      assignedWorkspaceId: null,
      isDeviceLocked: false,
    };
  }

  return {
    assignedWorkspaceId: employee.workspaceId,
    isDeviceLocked: true,
  };
};

const hasPendingUpgrade = (employeeId: string): boolean => {
  const versionInfo = EXPERT_VERSION_INFO[employeeId];
  return Boolean(versionInfo?.newVersion && versionInfo.newVersion !== versionInfo.version);
};

const getTeamStatus = (
  members: EmployeeItem[],
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>,
): ManagementStatus => {
  const pendingBindingCount = members.filter(
    member => !deploymentByEmployeeId[member.id]?.assignedWorkspaceId,
  ).length;
  if (pendingBindingCount > 0) {
    return {
      label:
        pendingBindingCount === members.length ? "待分配" : `待分配 ${pendingBindingCount} 个`,
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
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>,
): ManagementStatus => {
  if (!deploymentByEmployeeId[employee.id]?.assignedWorkspaceId) {
    return {
      label: "待分配",
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
  employees,
  memberNames,
  onNavigateToTab,
  onUpdateEmployeeAccess,
  onUpdateEmployeeModel,
  workspaces,
}: AgentStoreViewProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<AgentFilterKey>("all");
  const [selectedEntry, setSelectedEntry] = useState<{ id: string; kind: AgentEntryKind } | null>(null);

  const teamMemberIds = useMemo(
    () => new Set(OWNED_EXPERT_TEAMS.flatMap(team => team.memberIds)),
    [],
  );

  const [deploymentByEmployeeId, setDeploymentByEmployeeId] = useState<
    Record<string, ExpertDeploymentState>
  >(() =>
    Object.fromEntries(
      employees.map(employee => [
        employee.id,
        buildInitialDeploymentState(employee, !teamMemberIds.has(employee.id)),
      ]),
    ),
  );

  useEffect(() => {
    setDeploymentByEmployeeId(prev => {
      const nextState = { ...prev };
      let changed = false;

      employees.forEach(employee => {
        if (!nextState[employee.id]) {
          nextState[employee.id] = buildInitialDeploymentState(employee, !teamMemberIds.has(employee.id));
          changed = true;
        }
      });

      return changed ? nextState : prev;
    });
  }, [employees, teamMemberIds]);

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

  const handleBindWorkspace = useCallback((employeeId: string, workspaceId: string): void => {
    setDeploymentByEmployeeId(prev => ({
      ...prev,
      [employeeId]: {
        assignedWorkspaceId: workspaceId,
        isDeviceLocked: true,
      },
    }));
  }, []);

  if (selectedTeam || selectedStandaloneExpert) {
    return (
      <AgentStoreTeamDetail
        deploymentByEmployeeId={deploymentByEmployeeId}
        detailTitle={selectedTeam?.name ?? selectedStandaloneExpert?.name ?? ""}
        employees={selectedEmployees}
        memberNames={memberNames}
        onBack={handleBack}
        onBindWorkspace={handleBindWorkspace}
        onNavigateToTab={onNavigateToTab}
        onUpdateAccess={onUpdateEmployeeAccess}
        onUpdateModel={onUpdateEmployeeModel}
        workspaces={workspaces}
      />
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>我的AI专家团</h1>
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
      </section>
    </div>
  );
};
