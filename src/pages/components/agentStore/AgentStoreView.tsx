import { useCallback, useMemo, useState } from "react";

import { CheckCircleOutlined, ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import { message, Modal } from "antd";

import type { OwnedExpertTeam } from "./types";
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
  const [upgradeTeam, setUpgradeTeam] = useState<OwnedExpertTeam | null>(null);

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

  const handleUpgradeConfirm = useCallback(() => {
    message.success(`${upgradeTeam?.name ?? "专家团"} 已成功升级到 ${upgradeTeam?.newVersion}`);
    setUpgradeTeam(null);
  }, [upgradeTeam]);

  const handleUpdateEmployeeModel = useCallback((employeeId: string, model: string) => {
    const targetEmployee = employees.find(item => item.id === employeeId);
    const employeeName = targetEmployee?.name ?? "该专家";

    message.success(`${employeeName} 的模型已切换为 ${model}`);
  }, [employees]);

  /* ── Detail sub-page ── */
  if (selectedTeamId) {
    const team = OWNED_EXPERT_TEAMS.find(t => t.id === selectedTeamId);
    if (team) {
      return (
        <AgentStoreTeamDetail
          employees={employees.filter(e => team.memberIds.includes(e.id))}
          memberNames={memberNames}
          onBack={handleBack}
          onNavigateToTab={onNavigateToTab}
          onUpdateEmployeeAccess={onUpdateEmployeeAccess}
          onUpdateEmployeeModel={handleUpdateEmployeeModel}
          team={team}
          workspace={workspaceMap.get(team.workspaceId)}
        />
      );
    }
  }

  /* ── Main tabs view ── */
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>我的AI专家团</h1>
        <p className={styles.pageSubtitle}>管理和升级您的 AI Agent 团队</p>
      </header>

      {/* Tabs */}
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

      {/* Tab content */}
      {activeTab === "owned" ? (
        <div className={styles.cardList}>
          {OWNED_EXPERT_TEAMS.map(team => (
            <OwnedTeamCard
              key={team.id}
              employees={employees}
              onUpgrade={setUpgradeTeam}
              onView={handleView}
              team={team}
              workspace={workspaceMap.get(team.workspaceId)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.cardList}>
          {/* Smart recommendation banner */}
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

      {/* Upgrade modal */}
      <Modal
        centered
        maskClosable={false}
        okText="确认升级"
        onCancel={() => setUpgradeTeam(null)}
        onOk={handleUpgradeConfirm}
        open={upgradeTeam !== null}
        title="确认升级"
        width={520}
      >
        {upgradeTeam && (
          <div className={styles.upgradeModal}>
            <div className={styles.upgradeInfo}>
              <div
                className={styles.cardIcon}
                style={{ background: `${upgradeTeam.categoryColor}12` }}
              >
                <span style={{ fontSize: 24 }}>{upgradeTeam.icon}</span>
              </div>
              <div>
                <p className={styles.upgradeName}>{upgradeTeam.name}</p>
                <p className={styles.upgradeVersions}>
                  当前版本: {upgradeTeam.version}
                  <br />
                  <span className={styles.upgradeNewVersion}>
                    新版本: {upgradeTeam.newVersion}
                  </span>
                </p>
              </div>
            </div>

            <div className={styles.upgradeNotes}>
              <p className={styles.upgradeNotesTitle}>更新内容:</p>
              {upgradeTeam.updateNotes?.map((note, i) => (
                <p key={i} className={styles.upgradeNoteItem}>
                  <CheckCircleOutlined className={styles.upgradeCheckIcon} />
                  {note}
                </p>
              ))}
            </div>

            <div className={styles.upgradeWarning}>
              <WarningOutlined className={styles.upgradeWarningIcon} />
              <div>
                <p className={styles.upgradeWarningTitle}>升级期间服务暂不可用</p>
                <p className={styles.upgradeWarningDesc}>预计升级时间: 2-5分钟</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
