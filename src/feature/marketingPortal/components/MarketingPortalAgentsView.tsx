import { MarketingPortalSceneCatalog } from "./MarketingPortalSceneCatalog";
import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalAgentsView.module.less";

/**
 * 营销门户 AI 专家团列表视图。
 */
export const MarketingPortalAgentsView = (): JSX.Element => {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.heroBlock}>
          <p className={layoutStyles.sectionLabel}>AI Expert Crews</p>
          <h1 className={styles.heroTitle}>AI 专家团</h1>
          <p className={styles.heroDescription}>
            对老板来说，挑的不是单个工具，而是一个业务场景能不能被稳定交付。先看场景，再看这一组 AI
            专家会怎样协同把事做完。
          </p>
        </header>

        <MarketingPortalSceneCatalog />
      </div>
    </div>
  );
};
