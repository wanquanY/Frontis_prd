import { PORTAL_EXPERT_SCENES } from "@/feature/marketingPortal/portalData";

import { MarketingExpertCrewExplorer } from "./MarketingExpertCrewExplorer";
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
        </header>

        <MarketingExpertCrewExplorer scenes={PORTAL_EXPERT_SCENES} />
      </div>
    </div>
  );
};
