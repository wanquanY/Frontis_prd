import { startTransition, useMemo, useState } from "react";

import { ArrowRightOutlined } from "@ant-design/icons";
import { Avatar } from "antd";
import classNames from "classnames";
import { Link } from "react-router-dom";

import type {
  MarketingAgentItem,
  MarketingExpertSceneItem,
  MarketingExpertSceneTone,
} from "@/feature/marketingPortal/types";
import {
  createMarketingContactPath,
  getMarketingAgentsBySceneId,
} from "@/feature/marketingPortal/utils";
import { getAvatarText, getAvatarUrl } from "@/pages/utils";

import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingExpertCrewExplorer.module.less";

interface MarketingExpertCrewExplorerProps {
  scenes: MarketingExpertSceneItem[];
  mode?: "compact" | "page";
  browseCardTo?: string;
}

interface ResolvedMarketingExpertScene {
  indexLabel: string;
  scene: MarketingExpertSceneItem;
  experts: MarketingAgentItem[];
}

const SCENE_TONE_CLASS_MAP: Record<MarketingExpertSceneTone, string> = {
  aqua: styles.isAquaScene,
  cobalt: styles.isCobaltScene,
  emerald: styles.isEmeraldScene,
  amber: styles.isAmberScene,
  violet: styles.isVioletScene,
};

/**
 * 按业务场景浏览 AI 专家团。
 */
export const MarketingExpertCrewExplorer = ({
  scenes,
  mode = "page",
  browseCardTo,
}: MarketingExpertCrewExplorerProps): JSX.Element => {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  const resolvedScenes = useMemo<ResolvedMarketingExpertScene[]>(() => {
    return scenes.map((scene, index) => ({
      indexLabel: `0${index + 1}`.slice(-2),
      scene,
      experts: getMarketingAgentsBySceneId(scene.id),
    }));
  }, [scenes]);

  const activeScene = useMemo(() => {
    if (!activeSceneId) {
      return null;
    }

    return resolvedScenes.find(item => item.scene.id === activeSceneId) ?? null;
  }, [activeSceneId, resolvedScenes]);

  const handleSceneToggle = (sceneId: string): void => {
    startTransition(() => {
      setActiveSceneId(currentSceneId => (currentSceneId === sceneId ? null : sceneId));
    });
  };

  if (resolvedScenes.length === 0) {
    return <div className={styles.emptyState} />;
  }

  if (activeScene) {
    const { indexLabel, scene, experts } = activeScene;

    return (
      <div
        className={classNames(
          styles.explorer,
          activeScene ? styles.isExpandedExplorer : styles.isCollapsedExplorer,
          mode === "compact" ? styles.isCompactExplorer : styles.isPageExplorer,
        )}
      >
        <div
          className={classNames(
            styles.expandedStage,
            mode === "compact" ? styles.isCompactExpandedStage : styles.isPageExpandedStage,
          )}
        >
          <article
            className={classNames(styles.expandedSceneCard, SCENE_TONE_CLASS_MAP[scene.tone])}
          >
            <img className={styles.sceneCoverImage} src={scene.coverImageUrl} alt={scene.title} />
            <div className={styles.sceneCoverShade} />
            <div className={styles.sceneCoverGrid} />

            <div className={styles.expandedSceneContent}>
              <div className={styles.sceneMeta}>
                <span className={styles.sceneIndex}>{indexLabel}</span>
                <span className={styles.sceneSubtitle}>{scene.subtitle}</span>
              </div>

              <div className={styles.expandedSceneCopy}>
                <h3 className={styles.expandedSceneTitle}>{scene.title}</h3>
                <p className={styles.expandedSceneSummary}>{scene.summary}</p>
              </div>

              <div className={styles.sceneCardActions}>
                <Link
                  className={classNames(layoutStyles.primaryButton, styles.sceneConsultButton)}
                  to={createMarketingContactPath(experts.map(expert => expert.name))}
                >
                  咨询这一组专家
                  <ArrowRightOutlined />
                </Link>

                <button
                  type="button"
                  className={styles.sceneActionButton}
                  onClick={() => handleSceneToggle(scene.id)}
                >
                  收起场景
                  <ArrowRightOutlined />
                </button>
              </div>
            </div>
          </article>

          <div className={styles.expandedRailPanel}>
            <div className={styles.expandedRailHeader}>
              <div className={styles.expandedRailCopy}>
                <p className={styles.expandedRailEyebrow}>Scene Overview</p>
                <h3 className={styles.expandedRailTitle}>{scene.title} 专家团</h3>
                <p className={styles.expandedRailDescription}>{scene.description}</p>
              </div>
            </div>

            <div className={styles.expertRail} role="list" aria-label={`${scene.title} 专家列表`}>
              {experts.map(expert => (
                <article key={expert.id} className={styles.expertCard}>
                  <div className={styles.expertHeader}>
                    <div className={styles.expertIdentity}>
                      <Avatar
                        shape="square"
                        src={getAvatarUrl(`marketing-portal-${expert.slug}`)}
                        className={styles.expertAvatar}
                      >
                        {getAvatarText(expert.name)}
                      </Avatar>
                      <div className={styles.expertIdentityBody}>
                        <h4 className={styles.expertName}>{expert.name}</h4>
                        <p className={styles.expertPrice}>{expert.priceRange}</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.expertCopy}>
                    <p className={styles.expertDescription}>{expert.introduction}</p>
                  </div>

                  <div className={styles.skillSection}>
                    <p className={styles.skillLabel}>具备技能</p>
                    <div className={styles.skillList}>
                      {expert.skills.map(skill => (
                        <span key={skill} className={styles.skillChip}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link className={styles.detailLink} to={`/portal/agents/${expert.slug}`}>
                    查看专家详情
                    <ArrowRightOutlined />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        styles.explorer,
        styles.isCollapsedExplorer,
        mode === "compact" ? styles.isCompactExplorer : styles.isPageExplorer,
      )}
    >
      <div
        className={classNames(
          styles.collapsedStrip,
          mode === "compact" ? styles.isCompactCollapsedStrip : styles.isPageCollapsedStrip,
        )}
        role="list"
        aria-label="AI 专家团场景入口"
      >
        {resolvedScenes.map(({ indexLabel, scene }) => (
          <button
            key={scene.id}
            type="button"
            className={classNames(styles.sceneEntry, SCENE_TONE_CLASS_MAP[scene.tone])}
            onClick={() => handleSceneToggle(scene.id)}
          >
            <img className={styles.sceneCoverImage} src={scene.coverImageUrl} alt={scene.title} />
            <div className={styles.sceneCoverShade} />
            <div className={styles.sceneCoverGrid} />

            <span className={styles.sceneEntryContent}>
              <span className={styles.sceneMeta}>
                <span className={styles.sceneIndex}>{indexLabel}</span>
                <span className={styles.sceneSubtitle}>{scene.subtitle}</span>
              </span>

              <span className={styles.sceneEntryTitle}>{scene.title}</span>

              <span className={styles.sceneActionButton}>
                点击展开
                <ArrowRightOutlined />
              </span>
            </span>
          </button>
        ))}

        {browseCardTo ? (
          <Link to={browseCardTo} className={classNames(styles.sceneEntry, styles.browseEntry)}>
            <span className={styles.browseEntryContent}>
              <span className={styles.browseEntryLabel}>View More</span>
              <span className={styles.browseEntryTitle}>查看更多</span>
              <span className={styles.sceneActionButton}>
                进入 AI 专家团
                <ArrowRightOutlined />
              </span>
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
};
