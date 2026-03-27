import { useMemo, useState } from "react";
import type { ComponentType } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  DashboardOutlined,
  EditOutlined,
  NotificationOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

import {
  MARKETING_SCENE_CATALOG_CATEGORIES,
  getVisibleMarketingSceneCatalogItems,
} from "@/feature/marketingPortal/sceneCatalog";
import type {
  MarketingSceneCatalogCategory,
  MarketingSceneCatalogIconKey,
  MarketingSceneCatalogItem,
} from "@/feature/marketingPortal/types";
import { createMarketingSceneDetailPath } from "@/feature/marketingPortal/utils";

import { MarketingPortalSceneConsultDrawer } from "./MarketingPortalSceneConsultDrawer";
import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalSceneCatalog.module.less";

const sceneIconMap: Record<MarketingSceneCatalogIconKey, ComponentType> = {
  shop: ShopOutlined,
  growth: RiseOutlined,
  content: EditOutlined,
  service: UserSwitchOutlined,
  organization: TeamOutlined,
  finance: BarChartOutlined,
  store: AppstoreOutlined,
  campaign: NotificationOutlined,
  training: AuditOutlined,
  dashboard: DashboardOutlined,
};

/**
 * AI 专家团场景目录。
 */
export const MarketingPortalSceneCatalog = (): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState<MarketingSceneCatalogCategory>("全部");
  const [consultingScene, setConsultingScene] = useState<MarketingSceneCatalogItem | null>(null);
  const visibleItems = useMemo(
    () => getVisibleMarketingSceneCatalogItems(activeCategory),
    [activeCategory],
  );

  return (
    <>
      <div className={styles.filterRow}>
        {MARKETING_SCENE_CATALOG_CATEGORIES.map(item => (
          <button
            key={item}
            type="button"
            className={classNames(
              styles.filterButton,
              item === activeCategory && styles.isActiveFilterButton,
            )}
            onClick={() => setActiveCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className={styles.sceneGrid}>
        {visibleItems.map(item => {
          const IconComponent = sceneIconMap[item.iconKey];

          return (
            <article
              key={item.scene.id}
              className={classNames(layoutStyles.darkSection, styles.sceneCard)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.iconBadge}>
                  <IconComponent />
                </div>

                <div className={styles.cardHeading}>
                  <div className={styles.titleRow}>
                    <h2 className={styles.cardTitle}>{item.scene.title}</h2>
                    <div className={styles.categoryList}>
                      {item.categories.map(category => (
                        <span key={category} className={styles.categoryChip}>
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className={styles.cardDescription}>{item.scene.description}</p>
                </div>
              </div>

              <div className={styles.expertGrid}>
                {item.agents.map(agent => (
                  <article key={agent.id} className={styles.expertCard}>
                    <h3 className={styles.expertName}>{agent.name}</h3>
                    <div className={styles.skillList}>
                      {agent.skills.slice(0, 4).map(skill => (
                        <span key={skill} className={styles.skillChip}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.cardActions}>
                <Link
                  className={classNames(layoutStyles.secondaryButton, styles.detailButton)}
                  to={createMarketingSceneDetailPath(item.scene.id)}
                >
                  查看详情
                </Link>
                <button
                  className={classNames(layoutStyles.primaryButton, styles.consultButton)}
                  type="button"
                  onClick={() => setConsultingScene(item)}
                >
                  立即咨询
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <MarketingPortalSceneConsultDrawer
        open={consultingScene !== null}
        sceneItem={consultingScene}
        onClose={() => setConsultingScene(null)}
      />
    </>
  );
};
