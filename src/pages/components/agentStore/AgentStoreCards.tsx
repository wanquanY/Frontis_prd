import classNames from "classnames";
import { SettingOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Avatar, Button } from "antd";

import type { SkillItem } from "../../types";
import { getAvatarText } from "../../utils";
import prototypeStyles from "../../FrontisPage.module.less";
import adminStyles from "../FrontisAdminViews.module.less";
import styles from "../FrontisWebViews.module.less";
import { MAX_AGENT_CARD_SKILLS } from "./agentStoreData";
import type { AgentStoreMarketItem, AgentStoreOwnedPresentation } from "./types";
import { renderSkillCategoryIcon } from "./agentStoreUtils";

interface AgentStoreOwnedExpertCardProps {
  installedSkills: SkillItem[];
  item: AgentStoreOwnedPresentation;
  onOpenConfig: (employeeId: string) => void;
  onOpenSkillModal: (employeeId: string) => void;
}

/**
 * 已购买专家卡片。
 */
export const AgentStoreOwnedExpertCard = ({
  installedSkills,
  item,
  onOpenConfig,
  onOpenSkillModal,
}: AgentStoreOwnedExpertCardProps): JSX.Element => {
  const previewSkills = installedSkills.slice(0, MAX_AGENT_CARD_SKILLS);
  const hiddenSkillCount = installedSkills.length - previewSkills.length;

  return (
    <article
      className={classNames(
        prototypeStyles.expertsEmployeeCard,
        styles.agentStoreCard,
        adminStyles.agentStoreCardOwned,
      )}
    >
      <div className={styles.agentStoreCardActions}>
        <Button
          size="small"
          icon={<SettingOutlined />}
          onClick={event => {
            event.stopPropagation();
            onOpenConfig(item.employee.id);
          }}
        >
          专家配置
        </Button>
      </div>

      <div className={adminStyles.agentStoreStatusRow}>
        <span
          className={classNames(
            adminStyles.agentStoreStatusBadge,
            adminStyles.agentStoreStatusBadgeOwned,
          )}
        >
          已购买
        </span>
        <span className={adminStyles.agentStoreStatusMeta}>
          {item.employee.visibility === "all" ? "当前全员可见" : "当前指定成员使用"}
        </span>
      </div>

      <div className={prototypeStyles.expertsEmployeeHeader}>
        <div className={prototypeStyles.expertsEmployeeIdentity}>
          <Avatar src={item.employee.avatarUrl} className={prototypeStyles.expertsEmployeeAvatar}>
            {getAvatarText(item.employee.name)}
          </Avatar>
          <div className={prototypeStyles.expertsEmployeeIdentityBody}>
            <div className={prototypeStyles.expertsEmployeeName}>{item.employee.name}</div>
            <div className={prototypeStyles.expertsEmployeeSkillCount}>
              已安装 {installedSkills.length} 个技能
            </div>
          </div>
        </div>
      </div>

      <div className={prototypeStyles.expertsEmployeeBody}>
        <div className={styles.agentStoreIntro}>
          <div className={styles.agentStoreDescription}>{item.employee.summary}</div>
          <div className={styles.agentStoreWelcome}>{item.employee.welcomeMessage}</div>
        </div>

        <div className={styles.agentStoreSkillSection}>
          <div className={styles.agentStoreSkillLabel}>已安装技能</div>
          {previewSkills.length > 0 ? (
            <div className={styles.agentStoreSkillList}>
              {previewSkills.map(skill => (
                <div key={skill.id} className={styles.agentStoreSkillItem}>
                  <span className={styles.agentStoreSkillIcon}>
                    {renderSkillCategoryIcon(skill.category)}
                  </span>
                  <div className={styles.agentStoreSkillBody}>
                    <div className={styles.agentStoreSkillTitleRow}>
                      <span className={styles.agentStoreSkillName}>{skill.name}</span>
                      <span className={styles.agentStoreSkillCategory}>{skill.category}</span>
                    </div>
                  </div>
                </div>
              ))}
              {hiddenSkillCount > 0 ? (
                <button
                  type="button"
                  className={styles.agentStoreSkillMoreButton}
                  onClick={() => onOpenSkillModal(item.employee.id)}
                >
                  查看更多技能
                  <span className={styles.agentStoreSkillMoreCount}>+{hiddenSkillCount}</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className={prototypeStyles.expertsEmployeeSkillEmpty}>当前未安装技能</div>
          )}
        </div>
      </div>
    </article>
  );
};

interface AgentStoreMarketExpertCardProps {
  item: AgentStoreMarketItem;
  onOpenPurchaseLead: (desiredAgent: string, sceneLabel: string) => void;
  sceneLabel: string;
}

/**
 * 待采购专家卡片。
 */
export const AgentStoreMarketExpertCard = ({
  item,
  onOpenPurchaseLead,
  sceneLabel,
}: AgentStoreMarketExpertCardProps): JSX.Element => (
  <article
    className={classNames(
      prototypeStyles.expertsEmployeeCard,
      styles.agentStoreCard,
      adminStyles.agentStoreCardMarket,
    )}
  >
    <div className={adminStyles.agentStoreStatusRow}>
      <span
        className={classNames(
          adminStyles.agentStoreStatusBadge,
          adminStyles.agentStoreStatusBadgePending,
        )}
      >
        未购买
      </span>
      <span className={adminStyles.agentStoreStatusMeta}>{item.category}</span>
    </div>

    <div className={prototypeStyles.expertsEmployeeHeader}>
      <div className={prototypeStyles.expertsEmployeeIdentity}>
        <Avatar
          className={classNames(
            prototypeStyles.expertsEmployeeAvatar,
            adminStyles.agentStoreMarketAvatar,
          )}
        >
          {getAvatarText(item.name)}
        </Avatar>
        <div className={prototypeStyles.expertsEmployeeIdentityBody}>
          <div className={prototypeStyles.expertsEmployeeName}>{item.name}</div>
          <div className={prototypeStyles.expertsEmployeeSkillCount}>{sceneLabel}</div>
        </div>
      </div>
    </div>

    <div className={prototypeStyles.expertsEmployeeBody}>
      <div className={styles.agentStoreIntro}>
        <div className={styles.agentStoreDescription}>{item.summary}</div>
        <div className={adminStyles.agentStoreMarketHighlight}>{item.highlight}</div>
      </div>

      <div className={styles.agentStoreSkillSection}>
        <div className={styles.agentStoreSkillLabel}>适用能力</div>
        <div className={adminStyles.agentStoreCapabilityList}>
          {item.capabilityTags.map(tag => (
            <span key={tag} className={adminStyles.agentStoreCapabilityTag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className={adminStyles.agentStoreHoverOverlay}>
      <div className={adminStyles.agentStoreHoverOverlayBody}>
        <div className={adminStyles.agentStoreHoverOverlayText}>
          支持按当前场景联系商务，确认采购、交付方式和上线周期。
        </div>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          className={adminStyles.agentStoreHoverOverlayAction}
          onClick={() => onOpenPurchaseLead(item.name, sceneLabel)}
        >
          联系商务购买
        </Button>
      </div>
    </div>
  </article>
);
