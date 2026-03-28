import { useState } from "react";

import { ArrowRightOutlined } from "@ant-design/icons";

import { MarketingPortalConsultationDrawer } from "./MarketingPortalConsultationDrawer";
import { MarketingPortalSceneCatalog } from "./MarketingPortalSceneCatalog";
import layoutStyles from "./MarketingPortalLayout.module.less";
import styles from "./MarketingPortalAgentsView.module.less";

/**
 * 营销门户 AI 专家团列表视图。
 */
export const MarketingPortalAgentsView = (): JSX.Element => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.heroBlock}>
          <h1 className={styles.heroTitle}>AI 专家团</h1>
          <p className={styles.heroDescription}>
            多款企业级 AI 专家场景，覆盖经营管理、电商运营、内容创作等核心业务，
            <br />
            先选场景，再看这一组 AI 专家怎样协同把事做完。
          </p>
          <div className={styles.heroActions}>
            <a
              className={layoutStyles.primaryButton}
              href="#scene-catalog"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("scene-catalog")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              探索场景
              <ArrowRightOutlined />
            </a>
            <button
              type="button"
              className={layoutStyles.secondaryButton}
              onClick={() => setDrawerOpen(true)}
            >
              预约演示
            </button>
          </div>
        </header>

        <div id="scene-catalog">
          <MarketingPortalSceneCatalog />
        </div>
      </div>

      <MarketingPortalConsultationDrawer
        open={drawerOpen}
        initialAgentNames={[]}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
