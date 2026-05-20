import { useState } from "react";

import {
  AppstoreOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from "@ant-design/icons";

import { ExpertPlazaView } from "./ExpertPlazaView";
import { SkillCenterView } from "./SkillCenterView";
import styles from "./SkillCenterView.module.less";

type AssetCatalogMode = "store" | "team";
type AssetCatalogTab = "experts" | "skills";

interface AssetCatalogViewProps {
  mode: AssetCatalogMode;
}

const STORE_TABS: Array<{ key: AssetCatalogTab; label: string; icon: JSX.Element }> = [
  { key: "experts", label: "AI专家", icon: <RobotOutlined /> },
  { key: "skills", label: "技能", icon: <ThunderboltOutlined /> },
];

const TEAM_TABS: Array<{ key: AssetCatalogTab; label: string; icon: JSX.Element }> = [
  { key: "experts", label: "团队专家", icon: <AppstoreOutlined /> },
  { key: "skills", label: "团队技能", icon: <ToolOutlined /> },
];

/**
 * 统一承载平台商店与团队资产，避免 AI 专家和 Skill 分属不同信息架构。
 */
export const AssetCatalogView = ({ mode }: AssetCatalogViewProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<AssetCatalogTab>("experts");
  const tabs = mode === "store" ? STORE_TABS : TEAM_TABS;

  return (
    <div className={styles.assetCatalogRoot}>
      <div className={styles.assetCatalogTabs} role="tablist" aria-label="资产类型">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`${styles.assetCatalogTab} ${
              activeTab === tab.key ? styles.assetCatalogTabActive : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "experts" ? <ExpertPlazaView mode={mode} /> : <SkillCenterView mode={mode} />}
    </div>
  );
};
