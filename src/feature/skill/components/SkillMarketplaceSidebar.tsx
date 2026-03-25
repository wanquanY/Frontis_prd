import { ArrowLeftOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Skeleton } from "antd";
import classNames from "classnames";
import { useMemo } from "react";

import type { AdminAiEmployeeListItem } from "@/apis/AdminAiEmployeeApi";
import type { CoworkerAgentSkillItem } from "@/apis/SkillApi";
import type { SkillSummaryMap } from "@/feature/skill/types";
import ArrowDownIcon from "@/assets/images/arrow-down.png";
import { buildNameAvatarMeta } from "@/utils/nameAvatar";

import styles from "./SkillMarketplaceSidebar.module.less";

interface SkillMarketplaceAgentCardItem {
  id: string;
  name: string;
  avatarLines: string[];
  avatarBackground: string;
  avatarTextColor: string;
  skillCount: number;
  skillNames: string[];
}

/**
 * 技能广场左侧 AI 员工列表属性。
 */
export interface SkillMarketplaceSidebarProps {
  installAgents: AdminAiEmployeeListItem[];
  installAgentsLoading: boolean;
  installAgentsErrorMessage: string;
  selectedInstallAgentId?: string;
  expandedAgentId?: string;
  agentSkillBindingsByAgentId: Record<string, CoworkerAgentSkillItem[]>;
  skillSummaryMap: SkillSummaryMap;
  onSelectAgent: (agentId: string) => void;
  onRetryInstallAgents: () => void;
  onBackToWorkspace?: () => void;
}

/**
 * 技能广场左侧 AI 员工列表。
 */
export const SkillMarketplaceSidebar = ({
  installAgents,
  installAgentsLoading,
  installAgentsErrorMessage,
  selectedInstallAgentId,
  expandedAgentId,
  agentSkillBindingsByAgentId,
  skillSummaryMap,
  onSelectAgent,
  onRetryInstallAgents,
  onBackToWorkspace,
}: SkillMarketplaceSidebarProps): JSX.Element => {
  const agentCards = useMemo<SkillMarketplaceAgentCardItem[]>(
    () =>
      installAgents.map(agent => {
        const bindings = agentSkillBindingsByAgentId[agent.id] ?? [];
        const skillNames = bindings.map(
          item => skillSummaryMap[item.skill_id]?.name ?? `Skill #${item.skill_id}`,
        );
        const avatarMeta = buildNameAvatarMeta(agent.id, agent.name);

        return {
          id: agent.id,
          name: agent.name,
          avatarLines: avatarMeta.lines,
          avatarBackground: avatarMeta.background,
          avatarTextColor: avatarMeta.textColor,
          skillCount: bindings.length,
          skillNames,
        };
      }),
    [agentSkillBindingsByAgentId, installAgents, skillSummaryMap],
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>AI 员工列表</h2>
        {onBackToWorkspace ? (
          <button type="button" className={styles.sidebarBackButton} onClick={onBackToWorkspace}>
            <ArrowLeftOutlined />
            <span>返回对话</span>
          </button>
        ) : null}
      </div>

      {installAgentsErrorMessage ? (
        <Alert
          showIcon
          type="warning"
          message="AI 员工加载失败"
          description={installAgentsErrorMessage}
          action={
            <Button size="small" onClick={onRetryInstallAgents}>
              重试
            </Button>
          }
        />
      ) : null}

      {installAgentsLoading && installAgents.length === 0 ? (
        <div className={styles.sidebarSkeleton}>
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : null}

      {!installAgentsLoading && !installAgentsErrorMessage && agentCards.length === 0 ? (
        <div className={styles.sidebarEmpty}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 AI 员工" />
        </div>
      ) : null}

      {agentCards.length > 0 ? (
        <div className={styles.agentList}>
          {agentCards.map(agent => (
            <button
              key={agent.id}
              type="button"
              className={classNames(styles.agentCard, {
                [styles.agentCardActive]: agent.id === selectedInstallAgentId,
              })}
              onClick={() => onSelectAgent(agent.id)}
            >
              <div className={styles.agentCardHead}>
                <div className={styles.agentProfile}>
                  <span
                    className={classNames(styles.agentAvatar, {
                      [styles.agentAvatarMultiLine]: agent.avatarLines.length > 1,
                    })}
                    style={{
                      background: agent.avatarBackground,
                      color: agent.avatarTextColor,
                    }}
                  >
                    {agent.avatarLines.map(line => (
                      <span key={`${agent.id}-${line}`} className={styles.agentAvatarLine}>
                        {line}
                      </span>
                    ))}
                  </span>
                  <span className={styles.agentNameBlock}>
                    <span className={styles.agentName}>{agent.name}</span>
                    <span className={styles.agentSkillCount}>{agent.skillCount} 个技能</span>
                  </span>
                </div>
                {agent.id === selectedInstallAgentId ? (
                  <span className={styles.agentCardAside}>
                    <span className={styles.agentCurrentTag}>当前配置</span>
                    <span
                      className={classNames(styles.agentExpandIcon, {
                        [styles.agentExpandIconExpanded]: expandedAgentId === agent.id,
                      })}
                    >
                      <img src={ArrowDownIcon} alt="展开" />
                    </span>
                  </span>
                ) : (
                  <span
                    className={classNames(styles.agentExpandIcon, {
                      [styles.agentExpandIconExpanded]: expandedAgentId === agent.id,
                    })}
                  >
                    <img src={ArrowDownIcon} alt="展开" />
                  </span>
                )}
              </div>

              {expandedAgentId === agent.id && agent.skillNames.length > 0 ? (
                <div className={styles.agentSkillList}>
                  {agent.skillNames.slice(0, 3).map(skillName => (
                    <span key={`${agent.id}-${skillName}`} className={styles.agentSkillItem}>
                      {skillName}
                    </span>
                  ))}
                </div>
              ) : expandedAgentId === agent.id ? (
                <div className={styles.agentSkillEmpty}>暂无已绑定技能</div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
};
