import { buildAccessScopeSummary, normalizeAccessScopeSubjects } from "@/utils/organizationAccess";

import { Button, Tag } from "antd";

import type { EmployeeItem, OrganizationDepartmentItem, WorkspaceItem } from "../../types";
import { getAvatarText } from "../../utils";
import type { OwnedExpertTeam, RecommendedExpertTeam } from "./types";
import { EXPERT_VERSION_INFO } from "./AgentStoreTeamDetail";

import styles from "./AgentStoreView.module.less";

interface TeamCompositeAvatarProps {
  members: EmployeeItem[];
}

const TeamCompositeAvatar = ({ members }: TeamCompositeAvatarProps): JSX.Element => {
  const visibleMembers = members.slice(0, 9);
  const useCompactGrid = visibleMembers.length <= 4;

  return (
    <div
      className={`${styles.cardIcon} ${styles.teamCompositeAvatar} ${
        useCompactGrid ? styles.teamCompositeAvatarCompact : ""
      }`}
    >
      {visibleMembers.map(member => (
        <span key={member.id} className={styles.teamCompositeAvatarItem}>
          {member.avatarUrl ? (
            <img
              className={styles.teamCompositeAvatarImage}
              src={member.avatarUrl}
              alt={member.name}
            />
          ) : (
            <span className={styles.teamCompositeAvatarFallback}>{getAvatarText(member.name)}</span>
          )}
        </span>
      ))}
    </div>
  );
};

/* ── Owned Team Card ── */

interface OwnedTeamCardProps {
  employees: EmployeeItem[];
  organizationDepartments: OrganizationDepartmentItem[];
  onView: (teamId: string) => void;
  team: OwnedExpertTeam;
  workspace?: WorkspaceItem;
}

export const OwnedTeamCard = ({
  employees,
  organizationDepartments,
  onView,
  team,
  workspace,
}: OwnedTeamCardProps): JSX.Element => {
  const members = employees.filter(e => team.memberIds.includes(e.id));
  const isOnline = members.some(e => ["online", "running"].includes(e.status));
  const pendingUpgradeCount = team.memberIds.filter(memberId => {
    const versionInfo = EXPERT_VERSION_INFO[memberId];
    return Boolean(versionInfo?.newVersion && versionInfo.newVersion !== versionInfo.version);
  }).length;
  const accessScopeSummary = buildAccessScopeSummary(
    normalizeAccessScopeSubjects(
      members.flatMap(member =>
        member.visibility === "all"
          ? [{ subjectId: "company-root", subjectName: "全公司", subjectType: "company" as const }]
          : member.accessScopeSubjects,
      ),
      organizationDepartments,
    ),
  );

  return (
    <div className={styles.ownedCard}>
      <div className={styles.ownedCardBody}>
        <TeamCompositeAvatar members={members} />

        <div className={styles.cardContent}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>{team.name}</h3>
            {pendingUpgradeCount > 0 ? (
              <span className={styles.updateBadge}>{pendingUpgradeCount} 个待升级</span>
            ) : null}
          </div>
          <div className={styles.cardMeta}>
            <Tag color={team.categoryColor} bordered={false}>
              {team.category}
            </Tag>
          </div>
          <p className={styles.cardDesc}>{team.description}</p>
          <div className={styles.subAgentTags}>
            <span className={styles.subAgentTag}>{accessScopeSummary}</span>
          </div>
        </div>

        <div className={styles.cardRight}>
          <div className={styles.cardStatus}>
            <span className={isOnline ? styles.dotOnline : styles.dotOffline} />
            <span>{isOnline ? "在线" : "离线"}</span>
          </div>
          <div className={styles.cardInfoItem}>
            <span className={styles.cardInfoValue}>{members.length}</span>
            <span className={styles.cardInfoLabel}>AI 专家</span>
          </div>
          <div className={styles.cardInfoItem}>
            <span className={styles.cardInfoValue}>{accessScopeSummary}</span>
            <span className={styles.cardInfoLabel}>组织范围</span>
          </div>
          <div className={styles.cardInfoItem}>
            <span className={styles.cardInfoLabel}>{workspace?.name ?? "待确认运行环境"}</span>
          </div>
        </div>
      </div>

      <div className={styles.cardActions}>
        <Button type="primary" onClick={() => onView(team.id)}>
          进入配置
        </Button>
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
          <span className={styles.recPrice}>¥{team.price.toLocaleString()}</span>
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
