import { useCallback, useMemo, useState } from "react";
import type { ComponentType } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  CloseOutlined,
  DashboardOutlined,
  EditOutlined,
  NotificationOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { message } from "antd";
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

/** 单次「我的套餐」可选场景数量上限（与侧栏「已选 X/Y」一致）。 */
const PACKAGE_SCENE_LIMIT = 8;

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
 * 合并场景下各专家能力为能力标签（去重、截断）。
 */
const collectSceneSkillTags = (item: MarketingSceneCatalogItem, maxTags: number): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const agent of item.agents) {
    for (const skill of agent.skills) {
      if (!seen.has(skill)) {
        seen.add(skill);
        out.push(skill);
        if (out.length >= maxTags) {
          return out;
        }
      }
    }
  }
  return out;
};

/**
 * AI 专家团场景目录（顶部分类 + 卡片网格 + 右侧「我的套餐」）。
 */
export const MarketingPortalSceneCatalog = (): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState<MarketingSceneCatalogCategory>("全部");
  const [consultingScene, setConsultingScene] = useState<MarketingSceneCatalogItem | null>(null);
  const [packageSceneIds, setPackageSceneIds] = useState<string[]>([]);

  const allItems = useMemo(() => getVisibleMarketingSceneCatalogItems("全部"), []);
  const visibleItems = useMemo(
    () => getVisibleMarketingSceneCatalogItems(activeCategory),
    [activeCategory],
  );

  const packageItems = useMemo(
    () =>
      packageSceneIds
        .map(id => allItems.find(entry => entry.scene.id === id))
        .filter((entry): entry is MarketingSceneCatalogItem => entry !== undefined),
    [allItems, packageSceneIds],
  );

  const handleTogglePackage = useCallback(
    (item: MarketingSceneCatalogItem) => {
      const id = item.scene.id;
      setPackageSceneIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(s => s !== id);
        }
        if (prev.length >= PACKAGE_SCENE_LIMIT) {
          message.warning(`最多选择 ${PACKAGE_SCENE_LIMIT} 个场景加入套餐`);
          return prev;
        }
        return [...prev, id];
      });
    },
    [],
  );

  const handleRemoveFromPackage = useCallback((sceneId: string) => {
    setPackageSceneIds(prev => prev.filter(id => id !== sceneId));
  }, []);

  const handleConsultSelection = useCallback(() => {
    const first = packageItems[0];
    if (!first) {
      message.info("请先在卡片中加入至少一个专家团场景");
      return;
    }
    setConsultingScene(first);
  }, [packageItems]);

  return (
    <>
      <div className={styles.catalogShell}>
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

        <div className={styles.catalogBody}>
          <div className={styles.mainColumn}>
            <div className={styles.sceneGrid}>
              {visibleItems.map(item => {
                const IconComponent = sceneIconMap[item.iconKey];
                const skillTags = collectSceneSkillTags(item, 8);
                const isInPackage = packageSceneIds.includes(item.scene.id);

                return (
                  <article
                    key={item.scene.id}
                    className={classNames(layoutStyles.darkSection, styles.sceneCard)}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.iconBadge} aria-hidden>
                        <IconComponent />
                      </div>
                      <div className={styles.cardHeading}>
                        <h2 className={styles.cardTitle}>{item.scene.title}</h2>
                        <div className={styles.categoryList}>
                          {item.categories.map(category => (
                            <span key={category} className={styles.categoryChip}>
                              {category}
                            </span>
                          ))}
                        </div>
                        <p className={styles.cardDescription}>{item.scene.description}</p>
                        <div className={styles.skillList}>
                          {skillTags.map(skill => (
                            <span key={skill} className={styles.skillChip}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <Link
                        className={classNames(layoutStyles.secondaryButton, styles.detailButton)}
                        to={createMarketingSceneDetailPath(item.scene.id)}
                      >
                        查看详情
                      </Link>
                      <button
                        className={classNames(
                          layoutStyles.primaryButton,
                          styles.packageButton,
                          isInPackage && styles.isPackageAdded,
                        )}
                        type="button"
                        onClick={() => handleTogglePackage(item)}
                      >
                        {isInPackage ? "已加入套餐" : "加入套餐"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className={classNames(layoutStyles.darkSection, styles.packagePanel)} aria-label="我的套餐">
            <div className={styles.packagePanelHeader}>
              <h3 className={styles.packagePanelTitle}>我的套餐</h3>
              <p className={styles.packagePanelMeta}>
                已选 {packageSceneIds.length}/{PACKAGE_SCENE_LIMIT} 个场景
              </p>
            </div>

            {packageItems.length === 0 ? (
              <p className={styles.packageEmpty}>在左侧卡片点击「加入套餐」，将专家团场景加入清单。</p>
            ) : (
              <ul className={styles.packageList}>
                {packageItems.map(entry => (
                  <li key={entry.scene.id} className={styles.packageListItem}>
                    <span className={styles.packageDot} aria-hidden />
                    <span className={styles.packageListTitle}>{entry.scene.title}</span>
                    <button
                      type="button"
                      className={styles.packageRemove}
                      aria-label={`从套餐移除 ${entry.scene.title}`}
                      onClick={() => handleRemoveFromPackage(entry.scene.id)}
                    >
                      <CloseOutlined />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className={classNames(layoutStyles.primaryButton, styles.packageContinue)}
              onClick={handleConsultSelection}
            >
              下一步：咨询方案
            </button>
          </aside>
        </div>
      </div>

      <MarketingPortalSceneConsultDrawer
        open={consultingScene !== null}
        sceneItem={consultingScene}
        onClose={() => setConsultingScene(null)}
      />
    </>
  );
};
