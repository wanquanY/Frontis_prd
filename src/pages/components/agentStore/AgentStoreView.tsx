import { useCallback, useMemo, useState } from "react";

import { ThunderboltOutlined } from "@ant-design/icons";
import { message } from "antd";

import type { AgentStoreViewProps } from "./types";
import { OWNED_EXPERT_TEAMS, RECOMMENDED_EXPERT_TEAMS } from "./agentStoreData";
import { OwnedTeamCard, RecommendedTeamCard } from "./AgentStoreCards";
import { AgentStoreTeamDetail } from "./AgentStoreTeamDetail";

import styles from "./AgentStoreView.module.less";

type TabKey = "owned" | "recommended";

/**
 * 企业管理员侧 AI 专家团主视图。
 */
export const AgentStoreView = ({
  employees,
  memberNames,
  onNavigateToTab,
  onUpdateEmployeeAccess,
  workspaces,
}: AgentStoreViewProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>("owned");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const workspaceMap = useMemo(
    () => new Map(workspaces.map(w => [w.id, w])),
    [workspaces],
  );

  const handleView = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedTeamId(null);
  }, []);

  const handleUpdateEmployeeModel = useCallback(
    (employeeId: string, model: string) => {
      const targetEmployee = employees.find(item => item.id === employeeId);
      const employeeName = targetEmployee?.name ?? "该专家";

      message.success(`${employeeName} 的模型已切换为 ${model}`);
    },
    [employees],
  );

  if (selectedTeamId) {
    const team = OWNED_EXPERT_TEAMS.find(item => item.id === selectedTeamId);

    if (team) {
      return (
        <AgentStoreTeamDetail
          employees={employees.filter(item => team.memberIds.includes(item.id))}
          memberNames={memberNames}
          onBack={handleBack}
          onNavigateToTab={onNavigateToTab}
          onUpdateEmployeeAccess={onUpdateEmployeeAccess}
          onUpdateEmployeeModel={handleUpdateEmployeeModel}
          team={team}
          workspace={workspaceMap.get(team.workspaceId)}
          workspaces={workspaces}
        />
      );
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>我的AI专家团</h1>
        <p className={styles.pageSubtitle}>管理和升级您的 AI Agent 团队</p>
      </header>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={activeTab === "owned" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("owned")}
        >
          已购Agent ({OWNED_EXPERT_TEAMS.length})
        </button>
        <button
          type="button"
          className={activeTab === "recommended" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("recommended")}
        >
          推荐Agent ({RECOMMENDED_EXPERT_TEAMS.length})
        </button>
      </div>

      {activeTab === "owned" ? (
        <div className={styles.cardList}>
          {OWNED_EXPERT_TEAMS.map(team => (
            <OwnedTeamCard
              key={team.id}
              employees={employees}
              onView={handleView}
              team={team}
              workspace={workspaceMap.get(team.workspaceId)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.cardList}>
          <div className={styles.recBanner}>
            <ThunderboltOutlined className={styles.recBannerIcon} />
            <div>
              <p className={styles.recBannerTitle}>智能推荐</p>
              <p className={styles.recBannerDesc}>
                根据您的业务场景和现有Agent组合，为您推荐以下Agent
              </p>
            </div>
          </div>

          {RECOMMENDED_EXPERT_TEAMS.map(team => (
            <RecommendedTeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
};
