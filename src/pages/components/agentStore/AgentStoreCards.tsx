import { Button, Tag } from "antd";

import type { EmployeeItem, WorkspaceItem } from "../../types";
import type { OwnedExpertTeam, RecommendedExpertTeam } from "./types";

import styles from "./AgentStoreView.module.less";

/* ── Owned Team Card ── */

interface OwnedTeamCardProps {
  employees: EmployeeItem[];
  onUpgrade: (team: OwnedExpertTeam) => void;
  onView: (teamId: string) => void;
  team: OwnedExpertTeam;
  workspace?: WorkspaceItem;
}

export const OwnedTeamCard = ({
  employees,
  onUpgrade,
  onView,
  team,
  workspace,
}: OwnedTeamCardProps): JSX.Element => {
  const members = employees.filter(e => team.memberIds.includes(e.id));
  const isOnline = members.some(e => ["online", "busy", "idle"].includes(e.status));

  return (
    <div className={styles.ownedCard}>
      <div className={styles.ownedCardBody}>
        <div className={styles.cardIcon} style={{ background: `${team.categoryColor}12` }}>
          <span style={{ fontSize: 24 }}>{team.icon}</span>
        </div>

        <div className={styles.cardContent}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>{team.name}</h3>
            {team.hasNewVersion && <span className={styles.updateBadge}>有新版本</span>}
          </div>
          <div className={styles.cardMeta}>
            <Tag color={team.categoryColor} bordered={false}>
              {team.category}
            </Tag>
          </div>
          <p className={styles.cardDesc}>{team.description}</p>
          <div className={styles.subAgentTags}>
            {team.subAgentTags.map(tag => (
              <span key={tag} className={styles.subAgentTag}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.cardRight}>
          <div className={styles.cardStatus}>
            <span className={isOnline ? styles.dotOnline : styles.dotOffline} />
            <span>{isOnline ? "在线" : "离线"}</span>
          </div>
          <div className={styles.cardInfoItem}>
            <span className={styles.cardInfoLabel}>{team.version}</span>
          </div>
          <div className={styles.cardInfoItem}>
            <span className={styles.cardInfoValue}>
              {team.cumulativeTaskCount.toLocaleString()}
            </span>
            <span className={styles.cardInfoLabel}>累计任务</span>
          </div>
          {workspace && (
            <div className={styles.cardInfoItem}>
              <span className={styles.cardInfoLabel}>{workspace.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardActions}>
        <Button type="primary" onClick={() => onView(team.id)}>
          查看
        </Button>
        {team.hasNewVersion && (
          <>
            <Button onClick={() => onUpgrade(team)}>升级</Button>
            <Button type="text" size="small">
              忽略
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

/* ── Recommended Team Card ── */

interface RecommendedTeamCardProps {
  team: RecommendedExpertTeam;
}

export const RecommendedTeamCard = ({ team }: RecommendedTeamCardProps): JSX.Element => {
  return (
    <div className={styles.recCard}>
      <div className={styles.recCardBody}>
        <div className={styles.cardIcon} style={{ background: `${team.categoryColor}12` }}>
          <span style={{ fontSize: 24 }}>{team.icon}</span>
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{team.name}</h3>
          <div className={styles.cardMeta}>
            <Tag color={team.categoryColor} bordered={false}>
              {team.category}
            </Tag>
          </div>
          <p className={styles.cardDesc}>{team.description}</p>
          <p className={styles.recNote}>
            <span className={styles.recNoteIcon}>&#x21BB;</span>
            {team.recommendation}
          </p>
        </div>

        <div className={styles.recRight}>
          <span className={styles.recPrice}>
            ¥{team.price.toLocaleString()}
          </span>
          <span className={styles.recPriceUnit}>/年</span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <Button
          type="primary"
          onClick={() => window.open(`/portal/agents/${team.detailSlug}`, "_blank")}
        >
          了解详情 &gt;
        </Button>
      </div>
    </div>
  );
};
