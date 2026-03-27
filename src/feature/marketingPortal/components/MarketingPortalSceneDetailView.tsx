import { useMemo, useState } from "react";

import classNames from "classnames";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { getMarketingSceneCatalogItems } from "@/feature/marketingPortal/sceneCatalog";
import type {
  MarketingAgentItem,
  MarketingSceneCatalogItem,
} from "@/feature/marketingPortal/types";

import { MarketingPortalSceneConsultDrawer } from "./MarketingPortalSceneConsultDrawer";
import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalSceneDetailView.module.less";

interface MarketingPortalSceneDetailViewProps {
  sceneItem: MarketingSceneCatalogItem;
}

/**
 * AI 专家团场景详情页。
 */
export const MarketingPortalSceneDetailView = ({
  sceneItem,
}: MarketingPortalSceneDetailViewProps): JSX.Element => {
  const [activeAgentSlug, setActiveAgentSlug] = useState<string>(sceneItem.agents[0]?.slug ?? "");
  const [isConsultDrawerOpen, setConsultDrawerOpen] = useState<boolean>(false);
  const activeAgent = useMemo<MarketingAgentItem | null>(
    () =>
      sceneItem.agents.find(item => item.slug === activeAgentSlug) ?? sceneItem.agents[0] ?? null,
    [activeAgentSlug, sceneItem.agents],
  );
  const relatedScenes = useMemo(
    () =>
      getMarketingSceneCatalogItems()
        .filter(item => item.scene.id !== sceneItem.scene.id)
        .filter(item => item.categories.some(category => sceneItem.categories.includes(category)))
        .slice(0, 3),
    [sceneItem.categories, sceneItem.scene.id],
  );
  const taskDemo = sceneItem.scene.taskDemo;

  return (
    <div className={styles.page}>
      <section className={classNames(layoutStyles.darkSection, styles.heroSection)}>
        <Link className={styles.backLink} to="/portal/agents">
          <ArrowLeftOutlined />
          返回场景列表
        </Link>

        <div className={styles.heroGrid}>
          <div className={styles.heroMedia}>
            <img
              className={styles.heroImage}
              src={sceneItem.scene.coverImageUrl}
              alt={sceneItem.scene.title}
            />
            <div className={styles.heroOverlay} />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroMeta}>
              {sceneItem.categories.map(category => (
                <span key={category} className={layoutStyles.chip}>
                  {category}
                </span>
              ))}
            </div>

            <p className={styles.heroLabel}>Scene Detail</p>
            <h1 className={styles.heroTitle}>{sceneItem.scene.title}</h1>
            <p className={styles.heroSummary}>{sceneItem.scene.summary}</p>
            <p className={classNames(layoutStyles.darkTextMuted, styles.heroDescription)}>
              对老板来说，这不是在挑单个工具，而是在确认一个业务场景是否能被一组 AI
              专家稳定接管。这个场景里， Frontis 会用多位 AI 专家一起把任务交付出来。
            </p>

            <div className={styles.metricGrid}>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>{sceneItem.agents.length} 位</p>
                <p className={styles.metricLabel}>AI 专家协同交付</p>
              </article>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>
                  {sceneItem.agents.reduce((count, item) => count + item.skills.length, 0)} 项
                </p>
                <p className={styles.metricLabel}>场景覆盖技能</p>
              </article>
              <article className={styles.metricCard}>
                <p className={styles.metricValue}>{sceneItem.categories[0]}</p>
                <p className={styles.metricLabel}>场景归属</p>
              </article>
            </div>

            <div className={styles.heroActions}>
              <button
                className={layoutStyles.primaryButton}
                type="button"
                onClick={() => setConsultDrawerOpen(true)}
              >
                立即咨询
                <ArrowRightOutlined />
              </button>
              <Link className={layoutStyles.secondaryButton} to="/portal/agents">
                查看更多场景
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bodyGrid}>
        <article className={classNames(layoutStyles.lightSection, styles.storyCard)}>
          <p className={layoutStyles.sectionLabel}>Business Scene</p>
          <h2 className={styles.storyTitle}>场景说明</h2>
          <p className={styles.storyCopy}>{sceneItem.scene.description}</p>

          {taskDemo ? (
            <div className={styles.taskCard}>
              <p className={styles.taskLabel}>典型任务</p>
              <p className={styles.taskPrompt}>“{taskDemo.userPrompt}”</p>
              <p className={styles.taskNote}>{taskDemo.completionNote}</p>
            </div>
          ) : null}
        </article>

        <article className={classNames(layoutStyles.lightSection, styles.expertSection)}>
          <p className={layoutStyles.sectionLabel}>AI Experts</p>
          <h2 className={styles.expertSectionTitle}>AI 专家组合</h2>
          <div className={styles.expertTabs}>
            {sceneItem.agents.map(item => (
              <button
                key={item.id}
                type="button"
                className={classNames(
                  styles.expertTab,
                  activeAgent?.slug === item.slug && styles.isActiveExpertTab,
                )}
                onClick={() => setActiveAgentSlug(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>

          {activeAgent ? (
            <div className={styles.expertPanel}>
              <div className={styles.expertHeading}>
                <div>
                  <h3 className={styles.expertPanelTitle}>{activeAgent.name}</h3>
                  <p className={styles.expertPanelSummary}>{activeAgent.introduction}</p>
                </div>
                <span className={styles.priceTag}>{activeAgent.priceRange}</span>
              </div>

              <div className={styles.skillGroup}>
                {activeAgent.skills.map(skill => (
                  <span key={skill} className={styles.skillChip}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </section>

      {taskDemo ? (
        <section className={classNames(layoutStyles.lightSection, styles.flowSection)}>
          <div className={styles.flowHeading}>
            <div>
              <p className={layoutStyles.sectionLabel}>Crew Workflow</p>
              <h2 className={layoutStyles.sectionTitle}>这组 AI 专家会怎样协同</h2>
            </div>
          </div>

          <div className={styles.flowList}>
            {taskDemo.messages.map(message => (
              <article key={message.id} className={styles.flowItem}>
                <div className={styles.flowAvatar}>{message.speakerName.slice(0, 1)}</div>
                <div className={styles.flowBody}>
                  <div className={styles.flowMeta}>
                    <strong>{message.speakerName}</strong>
                    <span>{message.speakerRole}</span>
                  </div>
                  <p className={styles.flowCopy}>{message.content}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {relatedScenes.length ? (
        <section className={styles.relatedSection}>
          <div className={styles.relatedHeading}>
            <div>
              <p className={layoutStyles.sectionLabel}>Related Scenes</p>
              <h2 className={layoutStyles.sectionTitle}>你可能还会一起关心这些场景</h2>
            </div>
          </div>

          <div className={styles.relatedGrid}>
            {relatedScenes.map(item => (
              <article
                key={item.scene.id}
                className={classNames(layoutStyles.lightSection, styles.relatedCard)}
              >
                <h3 className={styles.relatedTitle}>{item.scene.title}</h3>
                <p className={styles.relatedCopy}>{item.scene.summary}</p>
                <Link className={styles.relatedLink} to={`/portal/agents/scenes/${item.scene.id}`}>
                  查看场景
                  <ArrowRightOutlined />
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <MarketingPortalSceneConsultDrawer
        open={isConsultDrawerOpen}
        sceneItem={sceneItem}
        onClose={() => setConsultDrawerOpen(false)}
      />
    </div>
  );
};
